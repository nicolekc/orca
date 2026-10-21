import { homedir } from "node:os";
import { join } from "node:path";
import { realDocker, type Docker } from "./docker";

/** Everything a command needs from the outside world, so tests can replace any of it. */
export type Context = {
  docker: Docker;
  /** ~/.orca on the Mac (ORCA_DIR overrides it) */
  orcaDir: string;
  /** The user's home on the Mac, for showing paths as ~/... */
  home: string;
  print: (line?: string) => void;
  /** Asks a question on the terminal; null when there's no terminal to ask on. */
  ask: ((question: string) => Promise<string>) | null;
  color: boolean;
};

export function realContext(): Context {
  const home = homedir();
  const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  return {
    docker: realDocker,
    orcaDir: process.env.ORCA_DIR ?? join(home, ".orca"),
    home,
    print: (line = "") => console.log(line),
    ask: interactive ? (q) => Promise.resolve(prompt(q) ?? "") : null,
    color: Boolean(process.stdout.isTTY) && !process.env.NO_COLOR,
  };
}

export const projectsDir = (ctx: Context) => join(ctx.orcaDir, "projects");

/** A failure the user can act on: what happened, and the command that fixes it. */
export class OrcaError extends Error {
  constructor(
    message: string,
    readonly fix?: string,
  ) {
    super(message);
  }
}

/** Shows a host path the way the user would type it. */
export function tilde(ctx: Context, path: string): string {
  return path === ctx.home || path.startsWith(ctx.home + "/") ? "~" + path.slice(ctx.home.length) : path;
}
