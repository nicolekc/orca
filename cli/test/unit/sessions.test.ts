import { expect, test } from "bun:test";
import { mkdirSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { listSessions } from "../../sessions";
import { fakeContext } from "../support/fake";

const id = (n: number) => `0000000${n}-0000-0000-0000-000000000000`;

function sessions(t: ReturnType<typeof fakeContext>, files: Record<string, object[]>) {
  const dir = join(t.ctx.orcaDir, "projects/app/home/.claude/projects/-workspace");
  mkdirSync(dir, { recursive: true });
  Object.entries(files).forEach(([name, records], i) => {
    const path = join(dir, `${name}.jsonl`);
    writeFileSync(path, records.map((r) => JSON.stringify(r)).join("\n") + "\n");
    utimesSync(path, 1000 + i, 1000 + i);
  });
}

const user = (content: unknown, extra = {}) => ({ type: "user", message: { role: "user", content }, ...extra });

test("a session is titled by Claude's latest title for it", () => {
  const t = fakeContext();
  sessions(t, { [id(1)]: [user("pull main"), { type: "ai-title", aiTitle: "Old title" }, { type: "ai-title", aiTitle: "Exporter" }] });
  expect(listSessions(t.ctx, "app")).toEqual([{ project: "app", id: id(1), title: "Exporter", updated: 1000000 }]);
});

test("a title the user set wins", () => {
  const t = fakeContext();
  sessions(t, { [id(1)]: [{ type: "ai-title", aiTitle: "AI" }, { type: "custom-title", customTitle: "Mine" }] });
  expect(listSessions(t.ctx, "app")[0].title).toBe("Mine");
});

test("without a title, the first thing the user typed, skipping meta messages", () => {
  const t = fakeContext();
  sessions(t, {
    [id(1)]: [user("<command-name>/exit</command-name>"), user("ignored", { isMeta: true }), user([{ type: "text", text: "fix the login bug" }])],
  });
  expect(listSessions(t.ctx, "app")[0].title).toBe("fix the login bug");
});

test("newest first; other files and missing folders are ignored", () => {
  const t = fakeContext();
  expect(listSessions(t.ctx, "app")).toEqual([]);
  sessions(t, { [id(1)]: [user("first")], [id(2)]: [user("second")], "notes": [user("x")] });
  expect(listSessions(t.ctx, "app").map((s) => s.title)).toEqual(["second", "first"]);
});

test("a long session file is read only at its ends", () => {
  const t = fakeContext();
  const filler = Array.from({ length: 4000 }, () => ({ type: "attachment", data: "x".repeat(200) }));
  sessions(t, { [id(1)]: [user("begin"), ...filler, { type: "ai-title", aiTitle: "Long one" }] });
  expect(listSessions(t.ctx, "app")[0].title).toBe("Long one");
});
