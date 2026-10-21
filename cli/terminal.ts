import { readConfig } from "./config";
import { OrcaError, type Context } from "./context";

/** Quotes an argument for a POSIX shell, unless it's plainly safe. */
export function shellQuote(arg: string): string {
  return /^[\w@%+=:,./-]+$/.test(arg) ? arg : `'${arg.replace(/'/g, `'\\''`)}'`;
}

const appleScriptString = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

/** The program that opens a terminal running `args`, from the `terminal` setting or Terminal on macOS. */
export function terminalArgv(ctx: Context, args: string[], platform = process.platform): string[] {
  const command = args.map(shellQuote).join(" ");
  const { terminal } = readConfig(ctx);
  if (terminal) return terminal.map((a) => a.replaceAll("{command}", command));
  if (platform === "darwin")
    return ["osascript", "-e", `tell application "Terminal" to do script ${appleScriptString(command)}`, "-e", `tell application "Terminal" to activate`];
  throw new OrcaError(
    "There's no terminal app set up for opening projects here.",
    `Set one in ~/.orca/config.json, e.g. {"terminal": ["x-terminal-emulator", "-e", "sh", "-c", "{command}"]}`,
  );
}

/** The orca to run in the new terminal: this same file when compiled, else the one on PATH. */
export const orcaPath = () => (process.execPath.endsWith("/bun") ? "orca" : process.execPath);

export async function openInTerminal(ctx: Context, args: string[]) {
  await ctx.launch(terminalArgv(ctx, args));
}
