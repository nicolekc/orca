// Each container's memory and CPU limits: a project's own (in its record, out of its
// container's reach), else the defaults in config.json, else orca's. Docker changes them on an
// existing container, running or not, so changing one never recreates anything.
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readConfig, writeConfig } from "./config";
import { OrcaError, type Context } from "./context";
import type { Container } from "./docker";
import { docker, recordDir } from "./projects";

/** Memory in bytes, and CPUs (fractions allowed) */
export type Limits = { memory: number; cpus: number };
/** A project's own, or the defaults: each one set or not */
export type LimitSettings = Partial<Limits>;
/** The limits a project gets, and where each comes from */
export type Effective = Limits & { from: { memory: Source; cpus: Source } };
type Source = "project" | "defaults" | "orca";

const GB = 1024 ** 3;
export const ORCA_LIMITS: Limits = { memory: 8 * GB, cpus: 4 };

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

/** 12884901888 → "12 GB" */
export function formatMemory(bytes: number): string {
  if (bytes >= GB) return `${+(bytes / GB).toFixed(1)} GB`;
  return `${Math.round(bytes / 1024 ** 2)} MB`;
}

export const describeLimits = (l: Limits) => `${formatMemory(l.memory)} of memory, ${l.cpus} CPU${l.cpus === 1 ? "" : "s"}`;

const ownFile = (ctx: Context, project: string) => join(recordDir(ctx, project), "limits.json");

export function readOwn(ctx: Context, project: string): LimitSettings {
  const file = ownFile(ctx, project);
  if (!existsSync(file)) return {};
  const raw = JSON.parse(readFileSync(file, "utf8")) as LimitSettings;
  return { memory: raw.memory, cpus: raw.cpus };
}

export function writeOwn(ctx: Context, project: string, own: LimitSettings) {
  const file = ownFile(ctx, project);
  if (own.memory === undefined && own.cpus === undefined) return rmSync(file, { force: true });
  writeFileSync(file, JSON.stringify(own) + "\n");
}

/** The defaults from config.json, which holds memory as text (e.g. "12g") */
export function readDefaults(ctx: Context): LimitSettings {
  const c = readConfig(ctx);
  return { memory: c.memory === undefined ? undefined : parseMemory(c.memory), cpus: c.cpus === undefined ? undefined : parseCpus(c.cpus) };
}

export function writeDefaults(ctx: Context, d: LimitSettings) {
  writeConfig(ctx, { memory: d.memory === undefined ? undefined : `${+(d.memory / GB).toFixed(3)}g`, cpus: d.cpus });
}

export function effective(ctx: Context, project: string): Effective {
  const own = readOwn(ctx, project);
  const defaults = readDefaults(ctx);
  const pick = (k: keyof Limits): [number, Source] =>
    own[k] !== undefined ? [own[k]!, "project"] : defaults[k] !== undefined ? [defaults[k]!, "defaults"] : [ORCA_LIMITS[k], "orca"];
  const [memory, m] = pick("memory");
  const [cpus, c] = pick("cpus");
  return { memory, cpus, from: { memory: m, cpus: c } };
}

/** docker arguments setting the limits, for docker run and docker update. Swap is twice the memory, Docker's own default. */
export const limitArgs = (l: Limits) => [`--memory=${l.memory}`, `--memory-swap=${l.memory * 2}`, `--cpus=${l.cpus}`];

/** Gives an existing container its limits if they differ; returns the old ones if it changed them. */
export async function applyLimits(ctx: Context, container: Container, l: Limits): Promise<Limits | null> {
  if (container.memory === l.memory && container.cpus === l.cpus) return null;
  await docker(ctx, ["update", ...limitArgs(l), container.name]);
  return { memory: container.memory, cpus: container.cpus };
}

/** What Docker has in all (Docker Desktop's VM), shared by every container */
export async function dockerTotal(ctx: Context): Promise<Limits | null> {
  const r = await ctx.docker.run(["info", "--format", "{{.MemTotal}} {{.NCPU}}"]);
  const [memory, cpus] = r.stdout.trim().split(" ").map(Number);
  return r.code === 0 && memory > 0 && cpus > 0 ? { memory, cpus } : null;
}

/** How much memory a running container uses right now, as Docker reports it (e.g. "2.1GiB") */
export async function memoryUsed(ctx: Context, container: string): Promise<string | null> {
  const r = await ctx.docker.run(["stats", "--no-stream", "--format", "{{.MemUsage}}", container]);
  return r.code === 0 ? r.stdout.split("/")[0].trim() || null : null;
}
