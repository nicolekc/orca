import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { OrcaError, tilde, type Context } from "./context";

/** Orca's settings, in ~/.orca/config.json. Every key is optional. */
export type Config = {
  /** The Mac port the forwards proxy listens on (127.0.0.1 only) */
  proxyPort: number;
};

const DEFAULTS: Config = { proxyPort: 7320 };

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
  if (!Number.isInteger(config.proxyPort) || config.proxyPort < 1 || config.proxyPort > 65535)
    throw new OrcaError(`proxyPort in ${tilde(ctx, file)} must be a port number (1–65535).`);
  return config;
}
