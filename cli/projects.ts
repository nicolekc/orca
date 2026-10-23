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
  /**
   * A container from before project homes existed, on the same folder, while it still needs
   * orca-migrate.sh. Once a migration has finished (or the project has its own container),
   * the old one is only a backup and isn't reported.
   */
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
  // Without a trailing slash, to match the folders Docker reports
  return existsSync(file) ? readFileSync(file, "utf8").trim().replace(/(.)\/+$/, "$1") || null : null;
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
    const old = containers.find((c) => !c.home && c.workspace !== null && c.workspace === folder) ?? null;
    const legacy = old && !container && !migrated(ctx, name) ? old : null;
    return {
      name,
      folder,
      managed: folder === join(recordDir(ctx, name), "workspace"),
      container,
      legacy,
      outdated: Boolean(container && latest && container.image !== latest.id),
    };
  });

  // Pre-migration containers whose folder has no record yet, one per folder (the most
  // recently used). Named after the folder, or the container when that name is taken, since
  // names identify projects everywhere.
  const unrecorded = containers
    .filter((c) => !c.home && c.workspace)
    .sort((a, b) => b.startedAt - a.startedAt);
  for (const c of unrecorded) {
    if (projects.some((p) => p.folder === c.workspace)) continue;
    const taken = (n: string) => projects.some((p) => p.name === n);
    let name = basename(c.workspace!);
    if (taken(name)) name = c.name;
    for (let i = 2; taken(name); i++) name = `${c.name}-${i}`;
    projects.push({ name, folder: c.workspace, managed: false, container: null, legacy: c, outdated: false });
  }

  const lastUsed = (p: Project) => Math.max(p.container?.startedAt ?? 0, p.legacy?.startedAt ?? 0);
  return projects.sort((a, b) => lastUsed(b) - lastUsed(a) || a.name.localeCompare(b.name));
}

/** orca-migrate.sh writes migrated-from once the home it copied checks out; a failed run doesn't. */
export const migrated = (ctx: Context, name: string) => existsSync(join(recordDir(ctx, name), "migrated-from"));

export async function listContainers(ctx: Context): Promise<Container[]> {
  const ids = await docker(ctx, ["ps", "-a", "-q"]);
  const list = ids.split("\n").filter(Boolean);
  if (list.length === 0) return [];
  return (JSON.parse(await docker(ctx, ["inspect", ...list])) as Parameters<typeof parseContainer>[0][]).map(parseContainer);
}

/** `terminals`: made from a Dockerfile with orca's terminals (its orca.terminals label) */
export type Image = { id: string; created: string; terminals: boolean };

export async function latestImage(ctx: Context): Promise<Image | null> {
  return inspectImage(ctx, "orca:latest");
}

export async function inspectImage(ctx: Context, ref: string): Promise<Image | null> {
  const r = await ctx.docker.run(["image", "inspect", ref]);
  if (r.code !== 0) return null;
  const [img] = JSON.parse(r.stdout) as { Id: string; Created: string; Config?: { Labels?: Record<string, string> | null } }[];
  return { id: img.Id, created: img.Created, terminals: img.Config?.Labels?.["orca.terminals"] === "1" };
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
