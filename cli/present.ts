import type { Project } from "./projects";

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
