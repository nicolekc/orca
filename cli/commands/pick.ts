import { existsSync } from "node:fs";
import { join } from "node:path";
import { OrcaError, type Context } from "../context";
import { keptBy } from "../present";
import { homeDir, loadProjects, type Project } from "../projects";
import { activities } from "../terminals";
import type { Choice } from "../ui/picker";
import { show } from "../ui/show";
import { del } from "./delete";
import { list } from "./list";
import { create } from "./new";
import { RECREATING, start } from "./start";
import { stop } from "./stop";

/** `orca` on its own: the picker; without a terminal, the plain list instead. */
export async function pick(ctx: Context): Promise<number> {
  const projects = await loadProjects(ctx);
  if (!ctx.ask) return list(ctx, {}).then(() => 0);
  const live = await activities(ctx, projects);
  const kept = Object.fromEntries([...live].map(([name, a]) => [name, keptBy(a)]));
  const choice = (await show(join(ctx.orcaDir, "orca.log"), "picker", { projects, home: ctx.home, kept })) ?? { action: "quit" };
  return act(ctx, projects, choice);
}

/** Does what was chosen in the picker. */
export async function act(ctx: Context, projects: Project[], choice: Choice): Promise<number> {
  if (choice.action === "quit") return 0;
  if (choice.action === "new") {
    const name = (await ctx.ask?.("Name for the new project: "))?.trim();
    return name ? create(ctx, name) : 0;
  }
  const p = projects.find((x) => x.name === choice.project)!;
  if (choice.action === "delete") {
    const hasHome = existsSync(homeDir(ctx, p.name));
    let home = hasHome && !p.container;
    if (hasHome && p.container && ctx.choose) {
      const answer = await ctx.choose(`Delete what of ${p.name}? Its code is never deleted.`, [
        { label: "Delete the container, keeping its home (logins, Claude memory, settings)", value: "container" },
        { label: "Delete the container and its home", value: "home" },
      ]);
      if (answer === null) return 0;
      home = answer === "home";
    }
    await del(ctx, p.name, { home });
    return 0;
  }
  const folder = p.folder ?? p.legacy?.workspace;
  if (!folder) throw new OrcaError(`${p.name} has no project folder on record.`);
  if (choice.action === "update") {
    ctx.print(`Switching ${p.name} to the newest image recreates its container.`);
    for (const line of RECREATING) ctx.print(`  ${line}`);
    if (p.container?.running && !(await stop(ctx, p.name, {}))) return 0;
  }
  return start(ctx, folder, { fresh: choice.action === "update" });
}
