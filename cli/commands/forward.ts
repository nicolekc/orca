import { existsSync, readdirSync } from "node:fs";
import { OrcaError, projectsDir, type Context } from "../context";
import { listContainers, containerName } from "../projects";
import { allForwards, readForwards, syncProxy, urlFor, writeForwards } from "../proxy";

export type ForwardOptions = { project: string; add?: number; remove?: number };

/** Adds, removes or lists a project's forwards, then brings the proxy in line. */
export async function forward(ctx: Context, opts: ForwardOptions): Promise<void> {
  const names = existsSync(projectsDir(ctx)) ? readdirSync(projectsDir(ctx)) : [];
  if (!names.includes(opts.project))
    throw new OrcaError(`There's no project named "${opts.project}".`, `Projects: ${names.join(", ") || "none yet"}`);
  const port = opts.add ?? opts.remove;
  if (port !== undefined && (!Number.isInteger(port) || port < 1 || port > 65535))
    throw new OrcaError(`"${port}" isn't a port: use a number from 1 to 65535.`);

  const current = readForwards(ctx, opts.project);
  const line = (p: number) => `${urlFor(ctx, p, opts.project)} → ${opts.project}:${p}`;

  if (opts.add !== undefined) {
    if (current.includes(opts.add)) {
      ctx.print(`Already forwarded: ${line(opts.add)}`);
      return;
    }
    writeForwards(ctx, opts.project, [...current, opts.add]);
    await syncProxy(ctx);
    ctx.print(`✓ ${line(opts.add)}`);
    const container = (await listContainers(ctx)).find((c) => c.name === containerName(opts.project));
    if (!container?.running) ctx.print(`  ${opts.project} isn't running; the address works once it is: orca start`);
    return;
  }

  if (opts.remove !== undefined) {
    if (!current.includes(opts.remove)) {
      ctx.print(`${opts.project} has no forward for port ${opts.remove}.`);
      return;
    }
    writeForwards(ctx, opts.project, current.filter((p) => p !== opts.remove));
    await syncProxy(ctx);
    ctx.print(`Removed ${urlFor(ctx, opts.remove, opts.project)}`);
    if (allForwards(ctx).length === 0) ctx.print("There are no forwards left, so the proxy is stopped.");
    return;
  }

  if (current.length === 0) ctx.print(`${opts.project} has no forwards. Add one: orca forward <port>`);
  for (const p of current) ctx.print(line(p));
}
