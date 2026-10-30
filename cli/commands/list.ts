import { tilde, type Context } from "../context";
import { keptBy, stateOf, symbol, IMAGE_UPDATE } from "../present";
import { loadProjects } from "../projects";
import { allForwards, proxyState, urlFor } from "../proxy";
import { activities } from "../terminals";

export async function list(ctx: Context, opts: { json?: boolean }): Promise<void> {
  const projects = await loadProjects(ctx);
  const live = await activities(ctx, projects);
  if (opts.json) {
    const forwards = allForwards(ctx);
    const rows = projects.map((p) => ({
      name: p.name,
      folder: p.folder,
      state: stateOf(p),
      imageUpdate: p.outdated,
      container: p.container?.name ?? null,
      terminals: live.get(p.name)?.terminals ?? [],
      keptUp: live.get(p.name)?.up ?? false,
      forwards: forwards.filter((f) => f.project === p.name).map((f) => ({ port: f.port, url: urlFor(ctx, f.port, p.name), urls: f.urls })),
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
    const kept = keptBy(live.get(p.name));
    return `${symbol[stateOf(p)]} ${stateOf(p)}${kept ? `, ${kept}` : ""}`;
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
    const ports = [proxy.port, ...proxy.ports].join(", :");
    ctx.print(`Forwards (proxy on 127.0.0.1:${ports}, ${proxy.running ? "running" : "stopped: starts with orca start or orca forward"}):`);
    for (const f of forwards) for (const url of [urlFor(ctx, f.port, f.project), ...f.urls]) ctx.print(`  ${url} → ${f.project}:${f.port}`);
  }
}
