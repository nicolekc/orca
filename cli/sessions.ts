import { closeSync, existsSync, openSync, readdirSync, readSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Context } from "./context";
import { homeDir } from "./projects";

/** A Claude session in a project's home, as the dashboard lists it. */
export type Session = { project: string; id: string; title: string; updated: number };

/** Where Claude keeps sessions for /workspace, inside a project's home */
const sessionsDir = (ctx: Context, project: string) => join(homeDir(ctx, project), ".claude/projects/-workspace");

export function listSessions(ctx: Context, project: string): Session[] {
  const dir = sessionsDir(ctx, project);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /^[0-9a-f-]{36}\.jsonl$/.test(f))
    .map((f) => {
      const path = join(dir, f);
      return { project, id: f.slice(0, -6), title: titleOf(path), updated: statSync(path).mtimeMs };
    })
    .sort((a, b) => b.updated - a.updated);
}

/**
 * Claude's own title for the session (its latest ai-title or custom-title record, near the
 * end), else the first thing the user typed. Session files can be many MB, so only the
 * last and first 256 KB are read.
 */
export function titleOf(path: string): string {
  const titled = lines(read(path, "end")).reverse().map(parse).find((r) => r?.customTitle || r?.aiTitle);
  if (titled) return String(titled.customTitle || titled.aiTitle);
  for (const r of lines(read(path, "start")).map(parse)) {
    if (r?.type !== "user" || r.isMeta) continue;
    const c = r.message?.content;
    const text = typeof c === "string" ? c : Array.isArray(c) ? c.find((p: { type: string }) => p.type === "text")?.text : undefined;
    if (text && !text.startsWith("<")) return text.length > 80 ? text.slice(0, 79) + "…" : text;
  }
  return "Untitled session";
}

const CHUNK = 256 * 1024;

function read(path: string, from: "start" | "end"): string {
  const size = statSync(path).size;
  const length = Math.min(size, CHUNK);
  const buf = Buffer.alloc(length);
  const fd = openSync(path, "r");
  try {
    readSync(fd, buf, 0, length, from === "start" ? 0 : size - length);
  } finally {
    closeSync(fd);
  }
  return buf.toString("utf8");
}

const lines = (text: string) => text.split("\n").filter(Boolean);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parse(line: string): any {
  try {
    return JSON.parse(line);
  } catch {
    return null; // a line cut off at the edge of a chunk
  }
}
