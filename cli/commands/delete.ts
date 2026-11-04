import { existsSync, lstatSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { OrcaError, tilde, type Context } from "../context";
import { docker, homeDir, listContainers, loadProjects, recordDir, volumeName } from "../projects";
import { allForwards, networkName, PROXY, syncProxy } from "../proxy";

export type DeleteOptions = { home?: boolean; yes?: boolean };

/**
 * Removes a project's container (and the node_modules volume older containers had); with
 * --home, also its home.
 * Never touches the project's code.
 */
export async function del(ctx: Context, name: string, opts: DeleteOptions): Promise<void> {
  const projects = await loadProjects(ctx);
  const p = projects.find((x) => x.name === name);
  if (!p)
    throw new OrcaError(`There's no project named "${name}".`, `Projects: ${projects.map((x) => x.name).join(", ") || "none yet"}`);
  if (!p.container && p.legacy)
    throw new OrcaError(
      `${name} only has its container from before project homes, ${p.legacy.name}; Orca doesn't delete those.`,
      `Migrate it with ~/orca/orca-migrate.sh, or remove it yourself: docker rm ${p.legacy.name}`,
    );
  if (p.container?.running)
    throw new OrcaError(`${p.container.name} is running.`, `Stop it first (this ends every terminal in it): orca stop ${name}`);

  const volume = p.container ? volumeName(p.container.name) : null;
  const hasVolume = volume !== null && (await ctx.docker.run(["volume", "inspect", volume])).code === 0;
  const home = homeDir(ctx, name);
  const removeHome = Boolean(opts.home) && existsSync(home);
  const record = recordDir(ctx, name);
  // The record goes with the home, unless it holds the project's code (orca new)
  const removeRecord = removeHome && !existsSync(join(record, "workspace"));
  const recordFiles = removeRecord ? readdirSync(record).filter((f) => f !== "home") : [];

  const removing = [
    p.container && `container ${p.container.name}`,
    hasVolume && `its node_modules volume, ${volume}`,
    removeHome && [`the home ${tilde(ctx, home)}: logins, Claude memory and sessions, settings, installed tools`, ...contents(home).map((l) => `    ${l}`)].join("\n"),
    recordFiles.length && `its record in ${tilde(ctx, record)}: ${recordFiles.join(", ")}`,
  ].filter(Boolean) as string[];
  if (removing.length === 0) {
    ctx.print(`${name} has no container${existsSync(home) ? "; its home stays unless you pass --home" : ""}. Nothing to delete.`);
    return;
  }

  ctx.print(`Deleting ${name}:`);
  for (const r of removing) ctx.print(`  - ${r}`);
  const kept = [p.folder && `the code in ${tilde(ctx, p.folder)}`, !removeHome && existsSync(home) && `the home ${tilde(ctx, home)}`].filter(Boolean);
  if (kept.length) ctx.print(`Kept: ${kept.join("; ")}`);

  if (!opts.yes) {
    if (!ctx.ask) throw new OrcaError("Deleting needs confirmation, and there's no terminal to ask on.", `Run it with --yes: orca delete ${name}${opts.home ? " --home" : ""} --yes`);
    if ((await ctx.ask(`Type ${name} to delete: `)).trim() !== name) {
      ctx.print("Nothing deleted.");
      return;
    }
  }

  if (p.container) await docker(ctx, ["rm", p.container.name]);
  if (hasVolume) await docker(ctx, ["volume", "rm", volume!]);
  if (removeHome) {
    rmSync(home, { recursive: true, force: true });
    if (removeRecord) rmSync(record, { recursive: true, force: true });
    else if (readdirSync(record).length) ctx.print(`The code stays in ${tilde(ctx, join(record, "workspace"))}; remove it yourself if you don't need it.`);
  }
  // The project's network goes with its container; the proxy leaves it first
  const network = networkName(name);
  if (p.container && (await ctx.docker.run(["network", "inspect", network])).code === 0) {
    const proxy = (await listContainers(ctx)).find((c) => c.name === PROXY);
    if (proxy?.networks.includes(network)) await docker(ctx, ["network", "disconnect", network, PROXY]);
    await docker(ctx, ["network", "rm", network]);
  }
  if (allForwards(ctx).length || (await listContainers(ctx)).some((c) => c.name === PROXY)) await syncProxy(ctx);
  ctx.print(`Deleted.`);
}

/** What's in a folder, as lines: its top-level entries, largest first, with their sizes. */
function contents(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true })
    .map((e) => ({ name: e.name + (e.isDirectory() ? "/" : ""), size: sizeOf(join(dir, e.name)) }))
    .sort((a, b) => b.size - a.size);
  if (entries.length === 0) return ["(empty)"];
  const shown = entries.slice(0, 12);
  const rest = entries.slice(shown.length);
  const width = Math.max(...shown.map((e) => e.name.length));
  const lines = shown.map((e) => `${e.name.padEnd(width)}  ${bytes(e.size)}`);
  if (rest.length) lines.push(`…and ${rest.length} more, ${bytes(rest.reduce((n, e) => n + e.size, 0))}`);
  return lines;
}

/** A file's size, or everything under a folder; symlinks count as themselves, never followed. */
function sizeOf(path: string): number {
  try {
    const s = lstatSync(path);
    if (!s.isDirectory()) return s.size;
    return readdirSync(path).reduce((n, e) => n + sizeOf(join(path, e)), 0);
  } catch {
    return 0;
  }
}

function bytes(n: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (n >= 1000 && i < units.length - 1) (n /= 1000), i++;
  return `${i === 0 || n >= 10 ? Math.round(n) : n.toFixed(1)} ${units[i]}`;
}
