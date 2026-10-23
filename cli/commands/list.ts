import { tilde, type Context } from "../context";
import { stateOf, symbol, IMAGE_UPDATE } from "../present";
import { loadProjects } from "../projects";
import { allForwards, proxyState, urlFor } from "../proxy";
import { openTerminals } from "../terminals";

export async function list(ctx: Context, opts: { json?: boolean }): Promise<void> {
  const projects = await loadProjects(ctx);
  const terminals = await openTerminals(ctx, projects);
  if (opts.json) {
    const forwards = allForwards(ctx);
    const rows = projects.map((p) => ({
      name: p.name,
      folder: p.folder,
      state: stateOf(p),
      imageUpdate: p.outdated,
      container: p.container?.name ?? null,
      terminals: terminals.get(p.name) ?? [],
      forwards: forwards.filter((f) => f.project === p.name).map((f) => ({ port: f.port, url: urlFor(ctx, f.port, p.name) })),
    }));
    ctx.print(JSON.stringify(rows, null, 2));
    return;
  }
  if (projects.length === 0) {
    ctx.print("No projects yet. Start one in a folder with `orca start`, or make a new one with `orca new <name>`.");
    return;
  }
  const width = Math.max(...projects.map((p) => p.name.length));
  const label = (p: (typeof projects)[number]) => {
    const n = terminals.get(p.name)?.length;
    return `${symbol[stateOf(p)]} ${stateOf(p)}${n ? `, ${n} terminal${n === 1 ? "" : "s"}` : ""}`;
  };
  const stateWidth = Math.max(...projects.map((p) => label(p).length));
  for (const p of projects) {
    const state = label(p);
    const folder = p.folder ? tilde(ctx, p.folder) : "";
    ctx.print(`${p.name.padEnd(width)}  ${state.padEnd(stateWidth)}  ${folder}${p.outdated ? `  ${IMAGE_UPDATE}` : ""}`.trimEnd());
  }

  const forwards = allForwards(ctx);
  if (forwards.length) {
    const proxy = await proxyState(ctx);
    ctx.print();
    ctx.print(`Forwards (proxy on 127.0.0.1:${proxy.port}, ${proxy.running ? "running" : "stopped: starts with orca start or orca forward"}):`);
    for (const f of forwards) ctx.print(`  ${urlFor(ctx, f.port, f.project)} → ${f.project}:${f.port}`);
  }
}
