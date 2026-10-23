import { homedir } from "node:os";
import { join } from "node:path";
import { realDocker, type Docker, type Result } from "./docker";

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
  /** Starts a program on the Mac without waiting for it (e.g. a terminal window) */
  launch: (argv: string[]) => Promise<void>;
  /** Runs a program on the Mac and captures its output (e.g. git config, for a new home) */
  host: (argv: string[]) => Promise<Result>;
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
    launch: async (argv) => {
      const proc = Bun.spawn(argv, { stdio: ["ignore", "ignore", "pipe"] });
      if ((await proc.exited) !== 0) throw new OrcaError(`Couldn't open a terminal: ${(await new Response(proc.stderr).text()).trim()}`);
    },
    host: async (argv) => {
      try {
        // Detached from the terminal, as docker's runs are, so it doesn't take the window's title
        const proc = Bun.spawn(argv, { stdout: "pipe", stderr: "pipe", detached: true });
        const [stdout, stderr, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
        return { code, stdout, stderr };
      } catch {
        return { code: 127, stdout: "", stderr: `${argv[0]}: command not found` };
      }
    },
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
