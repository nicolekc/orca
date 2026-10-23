import { expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { shellQuote, terminalArgv } from "../../terminal";
import { fakeContext } from "../support/fake";

test("plain arguments stay readable; anything else is single-quoted for the shell", () => {
  expect(shellQuote("/Users/me/dev/app")).toBe("/Users/me/dev/app");
  expect(shellQuote("my app")).toBe("'my app'");
  expect(shellQuote("it's; rm -rf ~")).toBe(`'it'\\''s; rm -rf ~'`);
});

test("on macOS the default is Terminal, with the command as an AppleScript string", () => {
  const t = fakeContext();
  const argv = terminalArgv(t.ctx, ["orca", "start", '/Users/me/a "b"'], "darwin");
  expect(argv[0]).toBe("osascript");
  expect(argv[2]).toBe(`tell application "Terminal" to do script "orca start '/Users/me/a \\"b\\"'"`);
});

test("the terminal setting replaces the default, filling in {command}", () => {
  const t = fakeContext();
  mkdirSync(t.ctx.orcaDir, { recursive: true });
  writeFileSync(join(t.ctx.orcaDir, "config.json"), JSON.stringify({ terminal: ["herdr", "run", "{command}"] }));
  expect(terminalArgv(t.ctx, ["orca", "start", "/x"], "darwin")).toEqual(["herdr", "run", "orca start /x"]);
});

test("with no setting off macOS, it says how to set one", () => {
  const t = fakeContext();
  const err = (() => {
    try {
      terminalArgv(t.ctx, ["orca"], "linux");
    } catch (e) {
      return e as { fix: string };
    }
  })();
  expect(err?.fix).toContain('"terminal"');
});
