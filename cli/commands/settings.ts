import { OrcaError, type Context } from "../context";
import {
  applySettings,
  defaultResources,
  describeResources,
  dockerTotal,
  effective,
  formatMemory,
  memorySetting,
  memoryUsed,
  parseCpus,
  readBoxSettings,
  readDefaultSettings,
  writeBoxSettings,
  writeDefaultSettings,
  type BoxSettings,
  type Effective,
  type Resources,
} from "../box-settings";
import { loadProjects, type Project } from "../projects";

/** `memory`, `cpus`: a new value, or "default" to go back to the defaults */
export type SettingsOptions = { memory?: string; cpus?: string; defaults?: boolean };

/** Shows or changes a project's box settings, or (with `defaults`) every project's defaults. */
export async function settings(ctx: Context, project: string | null, opts: SettingsOptions): Promise<void> {
  const changes = parseChanges(opts);
  const projects = await loadProjects(ctx);
  const total = await dockerTotal(ctx);
  if (changes.cpus !== undefined && total && changes.cpus > total.cpus)
    throw new OrcaError(`Docker has ${total.cpus} CPUs, so a container can't have ${changes.cpus}.`, "Raise it in Docker Desktop's Settings → Resources, or use fewer.");

  if (opts.defaults) {
    if (project) throw new OrcaError("--defaults is for every project, so it takes no project.", "orca settings --defaults --memory 12g");
    if (!changed(changes)) return showDefaults(ctx);
    const was = new Map(projects.map((p) => [p.name, effective(ctx, p.name)]));
    writeDefaultSettings(ctx, { ...readDefaultSettings(ctx), ...changes });
    showDefaults(ctx);
    // Projects that follow the defaults get them now
    for (const p of projects) {
      const now = effective(ctx, p.name);
      if (!same(now, was.get(p.name)!)) await apply(ctx, p, now);
    }
    warn(ctx, defaultResources(ctx), total);
    return;
  }

  if (!project) throw new OrcaError("This folder isn't in a project.", "orca settings <project>, or for every project's defaults: orca settings --defaults");
  const p = projects.find((x) => x.name === project);
  if (!p) throw new OrcaError(`There's no project named "${project}".`, `Projects: ${projects.map((x) => x.name).join(", ") || "none yet"}`);

  if (changed(changes)) {
    writeBoxSettings(ctx, p.name, { ...readBoxSettings(ctx, p.name), ...changes });
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
function parseChanges(opts: SettingsOptions): BoxSettings {
  const out: BoxSettings = {};
  if (opts.memory !== undefined) out.memory = opts.memory === "default" ? undefined : memorySetting(opts.memory);
  if (opts.cpus !== undefined) out.cpus = opts.cpus === "default" ? undefined : parseCpus(opts.cpus);
  return out;
}

const changed = (c: BoxSettings) => Object.keys(c).length > 0;
const same = (a: Resources, b: Resources) => a.memory === b.memory && a.cpus === b.cpus;
const source = (s: Effective["from"]["memory"]) => (s === "project" ? "its own" : s === "defaults" ? "the defaults" : "orca's default");

async function apply(ctx: Context, p: Project, r: Resources) {
  if (!p.container) return ctx.print(`${p.name} gets ${describeResources(r)} when its container is made.`);
  const old = await applySettings(ctx, p.container, r);
  ctx.print(old ? `${p.name} now has ${describeResources(r)} (was ${describeResources(old)}).` : `${p.name} already has ${describeResources(r)}.`);
}

const showDefaults = (ctx: Context) => ctx.print(`Defaults, for projects without their own: ${describeResources(defaultResources(ctx))}`);

/** More memory than Docker has is allowed, but Docker's own limit still applies */
function warn(ctx: Context, r: { memory: number }, total: { memory: number } | null) {
  if (total && r.memory > total.memory)
    ctx.print(`  That's more memory than Docker has (${formatMemory(total.memory)}), so Docker's limit applies. Raise it in Docker Desktop's Settings → Resources.`);
}
