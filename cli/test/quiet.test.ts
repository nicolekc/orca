import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { quietConsole } from "../ui/quiet";

test("while quiet, warnings go to the log once each, and the console comes back after", () => {
  const log = join(mkdtempSync(join(tmpdir(), "orca-quiet-")), "orca.log");
  const before = console.error;
  const restore = quietConsole(log);
  console.error("Encountered two children with the same key, `%s`.", "app");
  console.error("Encountered two children with the same key, `%s`.", "app");
  console.warn("something else");
  restore();
  const lines = readFileSync(log, "utf8").trim().split("\n");
  expect(lines).toHaveLength(2);
  expect(lines[0]).toContain("same key, `app`");
  expect(console.error).toBe(before);
});
