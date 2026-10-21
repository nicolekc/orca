import { tilde, type Context } from "../context";
import { stateOf, symbol, IMAGE_UPDATE } from "../present";
import { loadProjects } from "../projects";

export async function list(ctx: Context, opts: { json?: boolean }): Promise<void> {
  const projects = await loadProjects(ctx);
  if (opts.json) {
    const rows = projects.map((p) => ({ name: p.name, folder: p.folder, state: stateOf(p), imageUpdate: p.outdated, container: p.container?.name ?? null }));
    ctx.print(JSON.stringify(rows, null, 2));
    return;
  }
  if (projects.length === 0) {
    ctx.print("No projects yet. Start one in a folder with `orca start`, or make a new one with `orca new <name>`.");
    return;
  }
  const width = Math.max(...projects.map((p) => p.name.length));
  const stateWidth = Math.max(...projects.map((p) => stateOf(p).length)) + 2;
  for (const p of projects) {
    const state = `${symbol[stateOf(p)]} ${stateOf(p)}`;
    const folder = p.folder ? tilde(ctx, p.folder) : "";
    ctx.print(`${p.name.padEnd(width)}  ${state.padEnd(stateWidth)}  ${folder}${p.outdated ? `  ${IMAGE_UPDATE}` : ""}`.trimEnd());
  }
}
