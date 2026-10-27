// Box settings: each project's container's memory and CPUs. A project's own (in its record, out
// of its container's reach), else the defaults (boxSettings in config.json), else orca's.
// Docker changes them on an existing container, running or not, so a change never recreates it.
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readConfig, writeConfig } from "./config";
import { OrcaError, tilde, type Context } from "./context";
import type { Container } from "./docker";
import { docker, recordDir } from "./projects";

/** Box settings as stored, each one set or not: memory as written (e.g. "12g"), CPUs (fractions allowed) */
export type BoxSettings = { memory?: string; cpus?: number };
/** What a container gets: memory in bytes, and CPUs */
export type Resources = { memory: number; cpus: number };
/** The resources a project gets, and where each comes from */
export type Effective = Resources & { from: { memory: Source; cpus: Source } };
type Source = "project" | "defaults" | "orca";

const GB = 1024 ** 3;
export const ORCA_DEFAULTS: Resources = { memory: 8 * GB, cpus: 4 };

/** "12g", "12GB", "512m", "1.5 GB" → bytes */
export function parseMemory(text: string): number {
  const m = /^\s*(\d+(?:\.\d+)?)\s*([mg])i?b?\s*$/i.exec(text);
  const bytes = m ? Math.round(Number(m[1]) * (m[2].toLowerCase() === "g" ? GB : 1024 ** 2)) : NaN;
  if (!(bytes >= 512 * 1024 ** 2)) throw new OrcaError(`"${text}" isn't an amount of memory orca can give a container.`, "Use GB or MB, at least 512 MB: e.g. 12g, 1.5g or 512m");
  return bytes;
}

export function parseCpus(text: string | number): number {
  const n = typeof text === "number" ? text : /^\s*\d+(\.\d+)?\s*$/.test(text) ? Number(text) : NaN;
  if (!(n >= 0.1)) throw new OrcaError(`"${text}" isn't a number of CPUs.`, "Use a number, fractions allowed: e.g. 6 or 1.5");
  return n;
}

/** Memory as stored: what was typed, checked and tidied ("12 GB" → "12g") */
export const memorySetting = (text: string) => (parseMemory(text) % GB === 0 ? `${parseMemory(text) / GB}g` : `${Math.round(parseMemory(text) / 1024 ** 2)}m`);

/** 12884901888 → "12 GB" */
export function formatMemory(bytes: number): string {
  if (bytes >= GB) return `${+(bytes / GB).toFixed(1)} GB`;
  return `${Math.round(bytes / 1024 ** 2)} MB`;
}

export const describeResources = (r: Resources) => `${formatMemory(r.memory)} of memory, ${r.cpus} CPU${r.cpus === 1 ? "" : "s"}`;

const projectFile = (ctx: Context, project: string) => join(recordDir(ctx, project), "box-settings.json");

/** Checks stored settings, saying which file is wrong */
function checked(raw: BoxSettings, where: string): BoxSettings {
  try {
    if (raw.memory !== undefined) parseMemory(raw.memory);
    if (raw.cpus !== undefined) parseCpus(raw.cpus);
  } catch (e) {
    throw new OrcaError(`${where} has ${(e as OrcaError).message}`, (e as OrcaError).fix);
  }
  return { memory: raw.memory, cpus: raw.cpus };
}

export function readBoxSettings(ctx: Context, project: string): BoxSettings {
  const file = projectFile(ctx, project);
  if (!existsSync(file)) return {};
  return checked(JSON.parse(readFileSync(file, "utf8")) as BoxSettings, tilde(ctx, file));
}

export function writeBoxSettings(ctx: Context, project: string, s: BoxSettings) {
  const file = projectFile(ctx, project);
  if (s.memory === undefined && s.cpus === undefined) return rmSync(file, { force: true });
  writeFileSync(file, JSON.stringify(s, null, 2) + "\n");
}

export function readDefaultSettings(ctx: Context): BoxSettings {
  return checked(readConfig(ctx).boxSettings ?? {}, `boxSettings in ${tilde(ctx, join(ctx.orcaDir, "config.json"))}`);
}

export function writeDefaultSettings(ctx: Context, s: BoxSettings) {
  writeConfig(ctx, { boxSettings: s.memory === undefined && s.cpus === undefined ? undefined : s });
}

/** The defaults, filled in with orca's */
export function defaultResources(ctx: Context): Resources {
  const d = readDefaultSettings(ctx);
  return { memory: d.memory === undefined ? ORCA_DEFAULTS.memory : parseMemory(d.memory), cpus: d.cpus ?? ORCA_DEFAULTS.cpus };
}

export function effective(ctx: Context, project: string): Effective {
  const own = readBoxSettings(ctx, project);
  const defaults = readDefaultSettings(ctx);
  const pick = <K extends keyof BoxSettings>(k: K): [NonNullable<BoxSettings[K]> | undefined, Source] =>
    own[k] !== undefined ? [own[k]!, "project"] : defaults[k] !== undefined ? [defaults[k]!, "defaults"] : [undefined, "orca"];
  const [memory, m] = pick("memory");
  const [cpus, c] = pick("cpus");
  return { memory: memory === undefined ? ORCA_DEFAULTS.memory : parseMemory(memory), cpus: cpus ?? ORCA_DEFAULTS.cpus, from: { memory: m, cpus: c } };
}

/** docker arguments giving a container its resources, for docker run and docker update. Swap is twice the memory, Docker's own default. */
export const resourceArgs = (r: Resources) => [`--memory=${r.memory}`, `--memory-swap=${r.memory * 2}`, `--cpus=${r.cpus}`];

/** Gives an existing container its resources if they differ; returns the old ones if it changed them. */
export async function applySettings(ctx: Context, container: Container, r: Resources): Promise<Resources | null> {
  if (container.memory === r.memory && container.cpus === r.cpus) return null;
  await docker(ctx, ["update", ...resourceArgs(r), container.name]);
  return { memory: container.memory, cpus: container.cpus };
}

/** What Docker has in all (Docker Desktop's VM), shared by every container */
export async function dockerTotal(ctx: Context): Promise<Resources | null> {
  const r = await ctx.docker.run(["info", "--format", "{{.MemTotal}} {{.NCPU}}"]);
  const [memory, cpus] = r.stdout.trim().split(" ").map(Number);
  return r.code === 0 && memory > 0 && cpus > 0 ? { memory, cpus } : null;
}

/** How much memory a running container uses right now, as Docker reports it (e.g. "2.1GiB") */
export async function memoryUsed(ctx: Context, container: string): Promise<string | null> {
  const r = await ctx.docker.run(["stats", "--no-stream", "--format", "{{.MemUsage}}", container]);
  return r.code === 0 ? r.stdout.split("/")[0].trim() || null : null;
}
