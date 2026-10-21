import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { OrcaError, projectsDir, type Context } from "./context";
import { parseContainer, type Container } from "./docker";

/**
 * A project is a record, ~/.orca/projects/<name>/, holding its home (mounted as ~) and
 * project-path (the folder mounted as /workspace). Containers are disposable views of it.
 */
export type Project = {
  name: string;
  /** The project folder on the Mac, or null if the record doesn't say */
  folder: string | null;
  /** True when the folder is the record's own workspace (made by `orca new`) */
  managed: boolean;
  /** The project's container, if one exists */
  container: Container | null;
  /** A container from before project homes existed, on the same folder (needs orca-migrate.sh) */
  legacy: Container | null;
  /** The container was made from an older image than orca:latest */
  outdated: boolean;
};

export const recordDir = (ctx: Context, name: string) => join(projectsDir(ctx), name);
export const homeDir = (ctx: Context, name: string) => join(recordDir(ctx, name), "home");
export const containerName = (name: string) => `orca-${name}`;
export const volumeName = (container: string) => `${container}_node_modules`;

export function readFolder(ctx: Context, name: string): string | null {
  const file = join(recordDir(ctx, name), "project-path");
  return existsSync(file) ? readFileSync(file, "utf8").trim() || null : null;
}

export async function loadProjects(ctx: Context): Promise<Project[]> {
  const [containers, latest] = await Promise.all([listContainers(ctx), latestImage(ctx)]);
  const dir = projectsDir(ctx);
  const names = existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
    : [];

  const projects: Project[] = names.map((name) => {
    const folder = readFolder(ctx, name);
    const home = homeDir(ctx, name);
    const container = containers.find((c) => c.home === home) ?? null;
    const legacy = containers.find((c) => !c.home && c.workspace !== null && c.workspace === folder) ?? null;
    return {
      name,
      folder,
      managed: folder === join(recordDir(ctx, name), "workspace"),
      container,
      legacy,
      outdated: Boolean(container && latest && container.image !== latest.id),
    };
  });

  // Pre-migration containers whose folder has no record yet
  for (const c of containers) {
    if (c.home || !c.workspace || projects.some((p) => p.legacy === c)) continue;
    projects.push({ name: basename(c.workspace), folder: c.workspace, managed: false, container: null, legacy: c, outdated: false });
  }

  const lastUsed = (p: Project) => Math.max(p.container?.startedAt ?? 0, p.legacy?.startedAt ?? 0);
  return projects.sort((a, b) => lastUsed(b) - lastUsed(a) || a.name.localeCompare(b.name));
}

export async function listContainers(ctx: Context): Promise<Container[]> {
  const ids = await docker(ctx, ["ps", "-a", "-q"]);
  const list = ids.split("\n").filter(Boolean);
  if (list.length === 0) return [];
  return (JSON.parse(await docker(ctx, ["inspect", ...list])) as Parameters<typeof parseContainer>[0][]).map(parseContainer);
}

export type Image = { id: string; created: string };

export async function latestImage(ctx: Context): Promise<Image | null> {
  return inspectImage(ctx, "orca:latest");
}

export async function inspectImage(ctx: Context, ref: string): Promise<Image | null> {
  const r = await ctx.docker.run(["image", "inspect", ref]);
  if (r.code !== 0) return null;
  const [img] = JSON.parse(r.stdout) as { Id: string; Created: string }[];
  return { id: img.Id, created: img.Created };
}

/** Runs a docker command that must succeed, turning the common failures into fixes. */
export async function docker(ctx: Context, args: string[]): Promise<string> {
  const r = await ctx.docker.run(args);
  if (r.code === 0) return r.stdout;
  if (r.code === 127) throw new OrcaError("Docker isn't installed.", "Install Docker Desktop: https://docs.docker.com/desktop/");
  if (/Cannot connect to the Docker daemon|Is the docker daemon running/i.test(r.stderr))
    throw new OrcaError("Docker isn't running.", "Start Docker Desktop, then try again.");
  throw new OrcaError(`docker ${args[0]} failed: ${r.stderr.trim() || `exit ${r.code}`}`);
}
