import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { OrcaError, projectsDir, tilde, type Context } from "../context";
import {
  containerName,
  docker,
  homeDir,
  inspectImage,
  latestImage,
  listContainers,
  migrated,
  readFolder,
  recordDir,
  volumeName,
} from "../projects";
import { allForwards, ensureNetwork, syncProxy } from "../proxy";

export type StartOptions = {
  fresh?: boolean;
  /** Run this in the container instead of opening a shell (the container stays up in the background) */
  command?: string[];
};

/** Starts (or enters) the container for the project folder at `path`. */
export async function start(ctx: Context, path: string, opts: StartOptions): Promise<number> {
  const folder = resolve(path);
  if (!existsSync(folder) || !statSync(folder).isDirectory())
    throw new OrcaError(`${tilde(ctx, folder)} doesn't exist.`, "Pass a project folder, or create one with: orca new <name>");

  const name = recordFor(ctx, folder) ?? basename(folder);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(name))
    throw new OrcaError(
      `"${name}" can't be used as a project name: use letters, numbers, ".", "_" or "-".`,
      "Rename the folder, or create a project with: orca new <name>",
    );

  const container = containerName(name);
  const home = homeDir(ctx, name);
  const containers = await listContainers(ctx);
  const existing = containers.find((c) => c.name === container) ?? null;

  claimRecord(ctx, name, folder);

  const legacy = containers.find((c) => !c.home && c.workspace === folder);
  if (legacy && !existing && !migrated(ctx, name))
    throw new OrcaError(
      isEmpty(home)
        ? `${tilde(ctx, folder)} still has its container from before project homes, ${legacy.name}. Starting now would begin with an empty home.`
        : `${tilde(ctx, folder)}'s migration from ${legacy.name} didn't finish, so its home may be incomplete.`,
      isEmpty(home)
        ? `Migrate it first: ~/orca/orca-migrate.sh ${tilde(ctx, folder)}`
        : `Remove the partial copy and migrate again: rm -r ${tilde(ctx, home)} && ~/orca/orca-migrate.sh ${tilde(ctx, folder)}`,
    );

  const other = containers.find((c) => c.running && c.name !== container && c.workspace === folder);
  if (other)
    throw new OrcaError(`${other.name} is already running on this folder; both would edit the same files.`, `Exit it first, or: docker stop ${other.name}`);

  // The project's own network, which only the forwards proxy also joins
  const network = await ensureNetwork(ctx, name);
  if (existing && !opts.fresh && !existing.networks.includes(network)) await docker(ctx, ["network", "connect", network, container]);
  if (allForwards(ctx).length) await syncProxy(ctx);

  if (existing && opts.fresh) {
    if (existing.running)
      throw new OrcaError(`${container} is running.`, `Exit every session in it first, or: docker stop ${container}`);
    ctx.print(`Removing ${container} to recreate it (--fresh)`);
    await docker(ctx, ["rm", container]);
  } else if (existing) {
    await noticeOutdated(ctx, existing.image, folder);
    if (opts.command) {
      if (!existing.running) await docker(ctx, ["start", container]);
      return ctx.docker.attach(["exec", "-it", container, ...opts.command]);
    }
    if (existing.running) {
      ctx.print(`${name} is already running: opening another shell in it`);
      return ctx.docker.attach(["exec", "-it", container, "bash"]);
    }
    ctx.print(`Resuming ${name}`);
    return ctx.docker.attach(["start", "-ai", container]);
  }

  if (!(await latestImage(ctx))) throw new OrcaError("The orca image isn't on this Mac yet.", "Run: orca update");
  ctx.print(`Creating ${name}: ${tilde(ctx, folder)}, home in ${tilde(ctx, home)}`);
  const create = [
    "--name", container,
    "--label", `orca.project=${name}`,
    "--memory=8g", "--cpus=4",
    "--network", network,
    "-v", `${folder}:/workspace`,
    "-v", `${volumeName(container)}:/workspace/node_modules`,
    "-v", `${home}:/home/node`,
    "orca:latest", "bash",
  ];
  if (!opts.command) return ctx.docker.attach(["run", "-it", ...create]);
  // Its shell waits in the background, so the container outlives the command
  await docker(ctx, ["run", "-d", "-it", ...create]);
  return ctx.docker.attach(["exec", "-it", container, ...opts.command]);
}

/** The record already pointing at this folder, if any (e.g. `orca new` projects). */
function recordFor(ctx: Context, folder: string): string | null {
  const dir = projectsDir(ctx);
  if (!existsSync(dir)) return null;
  return readdirSync(dir).find((n) => readFolder(ctx, n) === folder) ?? null;
}

/** One home per project: two folders with the same name must not share memory. */
function claimRecord(ctx: Context, name: string, folder: string) {
  const owner = readFolder(ctx, name);
  if (owner && owner !== folder)
    throw new OrcaError(
      `The project "${name}" belongs to ${tilde(ctx, owner)}, not this folder.`,
      `If that project moved here, update ${tilde(ctx, join(recordDir(ctx, name), "project-path"))} to this path.`,
    );
  mkdirSync(homeDir(ctx, name), { recursive: true });
  if (!owner) writeFileSync(join(recordDir(ctx, name), "project-path"), folder + "\n");
}

const isEmpty = (dir: string) => !existsSync(dir) || readdirSync(dir).length === 0;

async function noticeOutdated(ctx: Context, used: string, folder: string) {
  const latest = await latestImage(ctx);
  if (!latest || latest.id === used) return;
  const when = (created: string | undefined) => created?.slice(0, 16).replace("T", " ");
  const usedBuilt = when((await inspectImage(ctx, used))?.created);
  const newestBuilt = when(latest.created);
  // Dates only help when they tell the two images apart
  ctx.print(
    usedBuilt && newestBuilt && usedBuilt !== newestBuilt
      ? `Image update available: this container's image was built ${usedBuilt}, the newest ${newestBuilt}.`
      : "Image update available: this container was made from an older orca image.",
  );
  ctx.print(`  To switch, exit and run:  orca start --fresh ${tilde(ctx, folder)}`);
  ctx.print(`  Kept:  the project folder, ~ (logins, memory, settings, installed tools), node_modules`);
  ctx.print(`  Reset: everything else in the container, such as system packages`);
  ctx.print();
}
