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
import { readConfig } from "../config";
import { applyCreation, checkWithout, containerArgs } from "../features";
import { allForwards, ensureNetwork, syncProxy } from "../proxy";
import { describe, hasTerminals, listTerminals, nextName, terminalArgs } from "../terminals";

export type StartOptions = {
  fresh?: boolean;
  /** Run this in a new terminal instead of a shell */
  command?: string[];
  /** Open a new terminal without asking about the open ones */
  new?: boolean;
  /** Attach to this terminal, creating it if it isn't open */
  terminal?: string;
  /** Creation features to leave out, if this creates the project's home */
  without?: string[];
};

/** Starts (or enters) the container for the project folder at `path`. */
export async function start(ctx: Context, path: string, opts: StartOptions): Promise<number> {
  const folder = resolve(path);
  if (!existsSync(folder) || !statSync(folder).isDirectory())
    throw new OrcaError(`${tilde(ctx, folder)} doesn't exist.`, "Pass a project folder, or create one with: orca new <name>");

  const name = recordFor(ctx, folder) ?? basename(folder);
  const without = [...(readConfig(ctx).without ?? []), ...(opts.without ?? [])];
  checkWithout(opts.without ?? [], "--without");
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(name))
    throw new OrcaError(
      `"${name}" can't be used as a project name: use letters, numbers, ".", "_" or "-".`,
      "Rename the folder, or create a project with: orca new <name>",
    );

  const container = containerName(name);
  const home = homeDir(ctx, name);
  const containers = await listContainers(ctx);
  const existing = containers.find((c) => c.name === container) ?? null;

  // A home created now gets the creation features; an existing one is never changed
  const newHome = isEmpty(home);
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
    if (existing.running) {
      const open = hasTerminals(existing) ? await listTerminals(ctx, container) : [];
      throw new OrcaError(
        `${container} is running${open.length ? `, with ${count(open.length)} open` : ""}.`,
        `Stop it first (this ends every terminal in it): orca stop ${name}`,
      );
    }
    ctx.print(`Removing ${container} to recreate it (--fresh)`);
    await docker(ctx, ["rm", container]);
    // Containers made before node_modules moved into the project folder had a volume for it
    if ((await ctx.docker.run(["volume", "rm", volumeName(container)])).code === 0)
      ctx.print("  Its node_modules is now the project folder's: install dependencies again if they're missing.");
  } else if (existing) {
    await noticeOutdated(ctx, existing.image, folder, name);
    if (!hasTerminals(existing)) return plainShell(ctx, name, container, existing.running, opts);
    if (!existing.running) {
      ctx.print(`Starting ${name}`);
      await docker(ctx, ["start", container]);
    }
    return openTerminal(ctx, name, container, opts);
  }

  const latest = await latestImage(ctx);
  if (!latest) throw new OrcaError("The orca image isn't on this Mac yet.", "Run: orca update");
  ctx.print(`Creating ${name}: ${tilde(ctx, folder)}, home in ${tilde(ctx, home)}`);
  if (newHome) await applyCreation(ctx, home, without);
  const create = ["--name", container, "--label", `orca.project=${name}`, ...containerArgs({ name, folder, home, network }), "orca:latest"];
  if (!latest.terminals) {
    // An image from before terminals: its main process is the first window's shell
    ctx.print("This image has no terminals yet; for them: orca update, then orca start --fresh");
    if (!opts.command) return ctx.docker.attach(["run", "-it", ...create, "bash"]);
    await docker(ctx, ["run", "-d", "-it", ...create, "bash"]);
    return ctx.docker.attach(["exec", "-it", container, ...opts.command]);
  }
  // The container runs in the background while any terminal is open (the image's orca-keepalive)
  await docker(ctx, ["run", "-d", ...create]);
  return openTerminal(ctx, name, container, opts);
}

/** Attaches this window to a terminal: the one asked for, a new one, or one the user picks. */
async function openTerminal(ctx: Context, name: string, container: string, opts: StartOptions): Promise<number> {
  const open = await listTerminals(ctx, container);
  let pick = opts.terminal ?? null;
  if (!pick && !opts.new && !opts.command && open.length && ctx.ask) {
    ctx.print(`${name} has ${count(open.length)} open:`);
    for (const t of open) ctx.print(`  ${describe(t)}`);
    const answer = (await ctx.ask("Attach to which? (its name, or Enter for a new terminal) ")).trim();
    if (answer && !open.some((t) => t.name === answer)) throw new OrcaError(`${name} has no terminal "${answer}".`, `Open ones: ${open.map((t) => t.name).join(", ")}`);
    pick = answer || null;
  }
  if (opts.command && pick && open.some((t) => t.name === pick))
    throw new OrcaError(`Terminal ${pick} is already open, so it can't run a new command.`, "Leave out --terminal to run it in a new one.");
  const terminal = pick ?? nextName(open);
  ctx.print(open.some((t) => t.name === terminal) ? `Attaching to ${name} terminal ${terminal}` : `Opening ${name} terminal ${terminal}`);
  ctx.print("  Closing this window leaves it running; exit its shell to end it.");
  return ctx.docker.attach(terminalArgs(container, terminal, opts.command));
}

/** A container from an image before terminals: shells as before, its first one being the container's own. */
async function plainShell(ctx: Context, name: string, container: string, running: boolean, opts: StartOptions): Promise<number> {
  ctx.print(`${name}'s container is from before terminals, so its shells end with their window. For terminals: orca start --fresh`);
  if (opts.command) {
    if (!running) await docker(ctx, ["start", container]);
    return ctx.docker.attach(["exec", "-it", container, ...opts.command]);
  }
  if (running) {
    ctx.print(`${name} is already running: opening another shell in it`);
    return ctx.docker.attach(["exec", "-it", container, "bash"]);
  }
  ctx.print(`Resuming ${name}`);
  return ctx.docker.attach(["start", "-ai", container]);
}

const count = (n: number) => `${n} terminal${n === 1 ? "" : "s"}`;

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

async function noticeOutdated(ctx: Context, used: string, folder: string, name: string) {
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
  ctx.print(`  To switch:  orca stop ${name}, then orca start --fresh ${tilde(ctx, folder)}`);
  ctx.print(`  Kept:  the project folder, ~ (logins, memory, settings, installed tools)`);
  ctx.print(`  Reset: everything else in the container, such as system packages`);
  ctx.print();
}
