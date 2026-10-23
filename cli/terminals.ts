import type { Context } from "./context";
import type { Container } from "./docker";

/**
 * A terminal in a project's container: a tmux session, so it keeps running when its window
 * closes. Windows on the Mac attach to one; any number of them can be open in a project.
 */
export type Terminal = {
  name: string;
  /** How many windows show it right now */
  attached: number;
  /** Last input or output, ms since epoch */
  active: number;
  /** What's running in it, e.g. claude or bash */
  command: string;
  /** The title the program running in it set (Claude sets the conversation's), if any */
  title: string | null;
};

/** Containers made from images before terminals open plain shells instead. */
export const hasTerminals = (c: Container) => c.labels["orca.terminals"] === "1";

const FORMAT = "#{session_name}|#{session_attached}|#{session_activity}|#{pane_current_command}|#{host}|#{pane_title}";

/** The terminals open in a running container (none when tmux has no server yet). */
export async function listTerminals(ctx: Context, container: string): Promise<Terminal[]> {
  const r = await ctx.docker.run(["exec", container, "tmux", "list-sessions", "-F", FORMAT]);
  if (r.code !== 0) return [];
  return r.stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [name, attached, active, command, host, ...title] = line.split("|");
      const t = title.join("|");
      // Until a program sets one, a pane's title is the container's hostname
      return { name, attached: Number(attached) || 0, active: Number(active) * 1000 || 0, command, title: t && t !== host ? t : null };
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

/** The next terminal name: the lowest number not in use. */
export function nextName(open: Terminal[]): string {
  for (let i = 1; ; i++) if (!open.some((t) => t.name === String(i))) return String(i);
}

/** docker arguments that attach this window to the named terminal, creating it (running `command`) if needed. */
export function terminalArgs(container: string, name: string, command?: string[]): string[] {
  // The Mac terminal's type, so colors and keys work inside tmux
  const exec = ["exec", "-it", "-e", "TERM", "-e", "COLORTERM", container, "tmux"];
  return command?.length ? [...exec, "new-session", "-s", name, "--", ...command] : [...exec, "new-session", "-A", "-s", name];
}

/** One line per terminal, for the command line. */
export function describe(t: Terminal, now = Date.now()): string {
  const parts = [t.command, t.attached ? "open in a window" : `active ${ago(t.active, now)}`];
  return `${t.name}  ${parts.join(" · ")}${t.title ? `  "${t.title}"` : ""}`;
}

function ago(ms: number, now: number): string {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}
