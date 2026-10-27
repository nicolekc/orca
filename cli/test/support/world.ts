import { mkdirSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createApi } from "../../server/api";
import { fakeContext, type FakeState } from "./fake";

/** A project as the dashboard tests describe it; everything else follows from these. */
export type Spec = {
  name: string;
  /** Its container: running, stopped, or none. Default: stopped */
  container?: "running" | "stopped" | "none";
  /** Open terminals: [name, command, title?, attached?] */
  terminals?: [string, string, string?, boolean?][];
  /** A container from an image before terminals */
  old?: boolean;
  /** Made from an older image than the newest */
  outdated?: boolean;
  forwards?: number[];
  sessions?: { id: string; title: string; updated: number }[];
  /** A container from before project homes, not migrated yet */
  notMigrated?: boolean;
};

const NOW = Math.floor(Date.now() / 1000);

/**
 * The real API over a fake Docker holding these projects, as orca serve would see them. Each
 * project's folder is ~/dev/<name>; the newest image was built 2026-10-21.
 */
export function world(specs: Spec[], state: Partial<FakeState> = {}, config: Record<string, unknown> = {}) {
  const t = fakeContext({ latest: "sha256:new", created: { "sha256:new": "2026-10-21T18:30:00Z", "sha256:old": "2026-09-01T00:00:00Z" }, ...state });
  specs.forEach((s, i) => {
    const folder = join(t.home, "dev", s.name);
    mkdirSync(folder, { recursive: true });
    if (s.notMigrated) {
      t.state.containers.push({ name: `old-${s.name}`, running: false, workspace: folder, startedAt: new Date(1000 * (NOW - i)).toISOString() });
      return;
    }
    const record = join(t.ctx.orcaDir, "projects", s.name);
    const home = join(record, "home");
    mkdirSync(join(home, ".claude/projects/-workspace"), { recursive: true });
    writeFileSync(join(record, "project-path"), folder + "\n");
    if (s.forwards) writeFileSync(join(record, "forwards"), s.forwards.join("\n") + "\n");
    for (const x of s.sessions ?? []) {
      const file = join(home, ".claude/projects/-workspace", `${x.id}.jsonl`);
      writeFileSync(file, JSON.stringify({ type: "ai-title", aiTitle: x.title }) + "\n");
      utimesSync(file, x.updated / 1000, x.updated / 1000);
    }
    if ((s.container ?? "stopped") === "none") return;
    t.state.containers.push({
      name: `orca-${s.name}`,
      running: s.container === "running",
      // Newest first, in the order given
      startedAt: new Date(1000 * (NOW - i)).toISOString(),
      image: s.outdated ? "sha256:old" : "sha256:new",
      labels: s.old ? {} : { "orca.terminals": "1", "orca.up": "1" },
      home,
      terminals: (s.terminals ?? []).map(([name, command, title, attached]) => `${name}|${attached ? 1 : 0}|${NOW - 60}|${command}|host|${title ?? "host"}`),
    });
  });
  // How the dashboard opens terminals here: a command line recorded in t.launched
  mkdirSync(t.ctx.orcaDir, { recursive: true });
  writeFileSync(join(t.ctx.orcaDir, "config.json"), JSON.stringify({ terminal: ["term", "{command}"], ...config }));
  const api = createApi(t.ctx, { orca: "orca", version: "test" });
  return { ...t, api };
}
