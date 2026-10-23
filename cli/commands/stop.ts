import { OrcaError, type Context } from "../context";
import { docker, loadProjects } from "../projects";
import { describe, hasTerminals, listTerminals } from "../terminals";

/** Stops a project's container, after saying which terminals that ends. */
export async function stop(ctx: Context, name: string, opts: { yes?: boolean }): Promise<void> {
  const projects = await loadProjects(ctx);
  const p = projects.find((x) => x.name === name);
  if (!p) throw new OrcaError(`There's no project named "${name}".`, `Projects: ${projects.map((x) => x.name).join(", ") || "none yet"}`);
  if (!p.container?.running) {
    ctx.print(`${name} isn't running.`);
    return;
  }
  const open = hasTerminals(p.container) ? await listTerminals(ctx, p.container.name) : [];
  if (open.length) {
    ctx.print(`Stopping ${name} ends its ${open.length === 1 ? "terminal" : `${open.length} terminals`}, and whatever runs in them:`);
    for (const t of open) ctx.print(`  ${describe(t)}`);
    ctx.print("Claude conversations in them can be continued later with claude --resume.");
    if (!opts.yes) {
      if (!ctx.ask) throw new OrcaError("Stopping needs confirmation, and there's no terminal to ask on.", `Run it with --yes: orca stop ${name} --yes`);
      if (!/^y(es)?$/i.test((await ctx.ask(`Stop ${name}? [y/N] `)).trim())) {
        ctx.print("Not stopped.");
        return;
      }
    }
  }
  await docker(ctx, ["stop", p.container.name]);
  ctx.print(`Stopped ${name}.`);
}
