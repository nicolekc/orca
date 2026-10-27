import type { Project } from "./projects";
import type { Activity } from "./terminals";

/** One word-and-symbol state per project, shared by `orca list` and the picker. */
export type State = "running" | "stopped" | "no container" | "not migrated";

export function stateOf(p: Project): State {
  if (p.container) return p.container.running ? "running" : "stopped";
  return p.legacy ? "not migrated" : "no container";
}

export const symbol: Record<State, string> = {
  running: "●",
  stopped: "○",
  "no container": "–",
  "not migrated": "!",
};

/** What color each state means: green is running, yellow needs the user's action. */
export const tone: Record<State, "green" | "yellow" | "dim" | undefined> = {
  running: "green",
  stopped: undefined,
  "no container": "dim",
  "not migrated": "yellow",
};

export const IMAGE_UPDATE = "⬆ image update";

/** What keeps a running project up, after its state: "kept up, 2 terminals" (empty if nothing). */
export function keptBy(a: Activity | undefined): string {
  const n = a?.terminals.length ?? 0;
  return [a?.up ? "kept up" : "", n ? `${n} terminal${n === 1 ? "" : "s"}` : ""].filter(Boolean).join(", ");
}
