import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { format } from "node:util";

/**
 * While a full-screen view like the picker is drawn, sends console warnings and errors to a
 * log file instead of the terminal, where each would add a line on every redraw. Each distinct
 * message is written once. Returns a function that puts the console back.
 */
export function quietConsole(logFile: string): () => void {
  const { error, warn } = console;
  const seen = new Set<string>();
  const log = (...args: unknown[]) => {
    const message = format(...args);
    if (seen.has(message)) return;
    seen.add(message);
    try {
      mkdirSync(dirname(logFile), { recursive: true });
      appendFileSync(logFile, `${new Date().toISOString()} ${message}\n`);
    } catch {
      // Nowhere to write it; dropping it beats breaking the view
    }
  };
  console.error = console.warn = log;
  return () => {
    console.error = error;
    console.warn = warn;
  };
}
