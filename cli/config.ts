import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { OrcaError, tilde, type Context } from "./context";
import { checkWithout } from "./features";

/** Orca's settings, in ~/.orca/config.json. Every key is optional. */
export type Config = {
  /** The Mac port the forwards proxy listens on (127.0.0.1 only) */
  proxyPort: number;
  /** The Mac port `orca serve` listens on (127.0.0.1 only) */
  servePort: number;
  /**
   * How the dashboard opens a terminal: a command whose arguments may contain {command},
   * the shell command to run (e.g. orca start ~/dev/app). Unset: macOS Terminal.
   */
  terminal?: string[];
  /** Features orca applies when it creates a project's home, to leave out (container-features.md) */
  without?: string[];
};

const DEFAULTS: Config = { proxyPort: 7320, servePort: 7321 };

export const configFile = (ctx: Context) => join(ctx.orcaDir, "config.json");

export function readConfig(ctx: Context): Config {
  const file = configFile(ctx);
  if (!existsSync(file)) return DEFAULTS;
  let raw: Partial<Config>;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    throw new OrcaError(`${tilde(ctx, file)} isn't valid JSON.`, `Fix or remove it; e.g. {"proxyPort": ${DEFAULTS.proxyPort}}`);
  }
  const config = { ...DEFAULTS, ...raw };
  for (const key of ["proxyPort", "servePort"] as const)
    if (!Number.isInteger(config[key]) || config[key] < 1 || config[key] > 65535)
      throw new OrcaError(`${key} in ${tilde(ctx, file)} must be a port number (1–65535).`);
  if (config.terminal !== undefined && (!Array.isArray(config.terminal) || config.terminal.length === 0 || config.terminal.some((a) => typeof a !== "string")))
    throw new OrcaError(`terminal in ${tilde(ctx, file)} must be a list of strings, e.g. ["my-terminal", "-e", "{command}"].`);
  if (config.without !== undefined) {
    if (!Array.isArray(config.without) || config.without.some((a) => typeof a !== "string"))
      throw new OrcaError(`without in ${tilde(ctx, file)} must be a list of feature names, e.g. ["git-identity"].`);
    checkWithout(config.without, `without in ${tilde(ctx, file)}`);
  }
  return config;
}
