import { OrcaError, type Context } from "../context";
import {
  applyLimits,
  describeLimits,
  dockerTotal,
  effective,
  formatMemory,
  memoryUsed,
  parseCpus,
  parseMemory,
  readDefaults,
  readOwn,
  writeDefaults,
  writeOwn,
  ORCA_LIMITS,
  type Effective,
  type LimitSettings,
} from "../limits";
import { loadProjects, type Project } from "../projects";

/** `memory`, `cpus`: a new value, or "default" to go back to the defaults */
export type LimitsOptions = { memory?: string; cpus?: string; defaults?: boolean };

/** Shows or sets a project's memory and CPU limits, or (with `defaults`) every project's defaults. */
export async function limits(ctx: Context, project: string | null, opts: LimitsOptions): Promise<void> {
  const changes = parseChanges(opts);
  const projects = await loadProjects(ctx);
  const total = await dockerTotal(ctx);
  if (changes.cpus !== undefined && total && changes.cpus > total.cpus)
    throw new OrcaError(`Docker has ${total.cpus} CPUs, so a container can't have ${changes.cpus}.`, "Raise it in Docker Desktop's Settings → Resources, or use fewer.");

  if (opts.defaults) {
    if (project) throw new OrcaError("--defaults is for every project, so it takes no project.", "orca limits --defaults --memory 12g");
    if (!changed(changes)) return showDefaults(ctx);
    const was = new Map(projects.map((p) => [p.name, effective(ctx, p.name)]));
    writeDefaults(ctx, { ...readDefaults(ctx), ...changes });
    showDefaults(ctx);
    // Projects that follow the defaults get them now
    for (const p of projects) {
      const now = effective(ctx, p.name);
      if (same(now, was.get(p.name)!)) continue;
      await apply(ctx, p, now);
    }
    warn(ctx, defaults(ctx), total);
    return;
  }

  if (!project) throw new OrcaError("This folder isn't in a project.", "orca limits <project>, or for every project's defaults: orca limits --defaults");
  const p = projects.find((x) => x.name === project);
  if (!p) throw new OrcaError(`There's no project named "${project}".`, `Projects: ${projects.map((x) => x.name).join(", ") || "none yet"}`);

  if (changed(changes)) {
    writeOwn(ctx, p.name, { ...readOwn(ctx, p.name), ...changes });
    await apply(ctx, p, effective(ctx, p.name));
  } else {
    const e = effective(ctx, p.name);
    ctx.print(`${p.name}: ${formatMemory(e.memory)} of memory (${source(e.from.memory)}), ${e.cpus} CPUs (${source(e.from.cpus)})`);
    const used = p.container?.running ? await memoryUsed(ctx, p.container.name) : null;
    if (used) ctx.print(`  Using ${used} of memory now.`);
  }
  if (total) ctx.print(`Docker has ${formatMemory(total.memory)} and ${total.cpus} CPUs in all, shared by every container.`);
  warn(ctx, effective(ctx, p.name), total);
}

/** The options as changes: a key left out stays as it is; one set to undefined goes back to the default. */
function parseChanges(opts: LimitsOptions): LimitSettings {
  const out: LimitSettings = {};
  if (opts.memory !== undefined) out.memory = opts.memory === "default" ? undefined : parseMemory(opts.memory);
  if (opts.cpus !== undefined) out.cpus = opts.cpus === "default" ? undefined : parseCpus(opts.cpus);
  return out;
}

const changed = (c: LimitSettings) => Object.keys(c).length > 0;
const same = (a: Effective, b: Effective) => a.memory === b.memory && a.cpus === b.cpus;
const source = (s: Effective["from"]["memory"]) => (s === "project" ? "its own" : s === "defaults" ? "the defaults" : "orca's default");

async function apply(ctx: Context, p: Project, l: Effective) {
  if (!p.container) return ctx.print(`${p.name} gets ${describeLimits(l)} when its container is made.`);
  const old = await applyLimits(ctx, p.container, l);
  ctx.print(old ? `${p.name} now has ${describeLimits(l)} (was ${describeLimits(old)}).` : `${p.name} already has ${describeLimits(l)}.`);
}

function defaults(ctx: Context) {
  const d = readDefaults(ctx);
  return { memory: d.memory ?? ORCA_LIMITS.memory, cpus: d.cpus ?? ORCA_LIMITS.cpus };
}

const showDefaults = (ctx: Context) => ctx.print(`Defaults, for projects without their own: ${describeLimits(defaults(ctx))}`);

/** More memory than Docker has is allowed, but Docker's own limit still applies */
function warn(ctx: Context, l: { memory: number }, total: { memory: number } | null) {
  if (total && l.memory > total.memory)
    ctx.print(`  That's more memory than Docker has (${formatMemory(total.memory)}), so Docker's limit applies. Raise it in Docker Desktop's Settings → Resources.`);
}
