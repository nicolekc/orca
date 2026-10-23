// The workspace file in a real editor (code-server, VS Code in a browser): its roots are the top
// and each repo, and search finds a word in a repo that the top's .gitignore hides, which
// opening the folder alone doesn't.
//   bun cli/test/editor.ts <project folder> <workspace file> <word> <file the word is in>
// Needs code-server on PATH. On failure, leaves editor-failure.png in the current folder.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, expect, type Page } from "playwright/test";

const [folder, workspace, word, file] = process.argv.slice(2);
const port = 7401;
const data = mkdtempSync(join(tmpdir(), "orca-editor-"));
const server = Bun.spawn(
  ["code-server", "--auth", "none", "--bind-addr", `127.0.0.1:${port}`, "--user-data-dir", data, "--extensions-dir", join(data, "ext"), "--disable-telemetry", "--disable-workspace-trust"],
  { stdout: "ignore", stderr: "ignore" },
);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

async function open(query: string) {
  for (let i = 0; i < 40; i++) {
    if (await fetch(`http://127.0.0.1:${port}/healthz`).then((r) => r.ok, () => false)) break;
    await Bun.sleep(500);
  }
  await page.goto(`http://127.0.0.1:${port}/?${query}`);
  await page.locator(".monaco-workbench").waitFor({ timeout: 60_000 });
}

async function search(p: Page): Promise<string> {
  await p.keyboard.press("Control+Shift+F");
  await p.keyboard.type(word);
  await p.locator(".search-view .messages, .search-view .monaco-list-row").first().waitFor({ timeout: 30_000 });
  await p.waitForTimeout(1500);
  return p.locator(".search-view").innerText();
}

try {
  await open(`folder=${folder}`);
  if ((await search(page)).includes(file)) throw new Error("The folder alone found the word: this check no longer shows what the workspace file is for");

  await open(`workspace=${workspace}`);
  await expect(page.getByText(/\(Workspace\)/).first()).toBeVisible();
  expect(await search(page)).toContain(file);
  console.log("editor: the workspace file's search reaches the repo the folder's search misses");
} catch (e) {
  await page.screenshot({ path: "editor-failure.png" });
  throw e;
} finally {
  await browser.close();
  server.kill();
}
