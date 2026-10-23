// The workspace file in a real editor (code-server, VS Code in a browser). A project whose top
// .gitignore hides its child repos, as an orchestration repo's would: opening the folder, search
// misses a word in a child repo; opening the workspace file orca writes, search finds it.
// Needs code-server: ./code-server.sh installs it and prints its path, passed as $CODE_SERVER.
// Each test gets its own code-server: one opened right after another's page closed sometimes
// came up with no folders.
import { afterAll, beforeAll, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, expect, type Browser, type Page } from "playwright/test";
import { workspaceFile } from "../../features";
import { fakeContext } from "../support/fake";

const root = mkdtempSync(join(tmpdir(), "orca-editor-"));
const folder = join(root, "shop");
const servers: ReturnType<typeof Bun.spawn>[] = [];
let browser: Browser;

beforeAll(async () => {
  if (!process.env.CODE_SERVER) throw new Error("Set CODE_SERVER to code-server's path: make browser does, or CODE_SERVER=$(cli/test/browser/code-server.sh)");
  for (const repo of ["api", "web"]) {
    mkdirSync(join(folder, repo), { recursive: true });
    Bun.spawnSync(["git", "init", "-q", join(folder, repo)]);
  }
  writeFileSync(join(folder, ".gitignore"), "api/\nweb/\n");
  writeFileSync(join(folder, "api/token.ts"), 'export const word = "zebracorn42";\n');
  workspaceFile(fakeContext().ctx, "shop", folder, []);
  browser = await chromium.launch();
}, 60_000);

afterAll(async () => {
  await browser?.close();
  for (const server of servers) server.kill();
});

/** Starts a code-server of its own on `port`, with its own settings and state; resolves once it answers. */
async function codeServer(port: number): Promise<void> {
  const data = join(root, `code-server-${port}`);
  servers.push(
    Bun.spawn([process.env.CODE_SERVER!, "--auth", "none", "--bind-addr", `127.0.0.1:${port}`, "--user-data-dir", data, "--extensions-dir", join(data, "ext"), "--disable-telemetry", "--disable-workspace-trust"], {
      stdout: "ignore",
      stderr: "ignore",
    }),
  );
  for (let i = 0; i < 60 && !(await fetch(`http://127.0.0.1:${port}/healthz`).then((r) => r.ok, () => false)); i++) await Bun.sleep(500);
}

/**
 * Opens a code-server of its own on `port` once the Explorer has loaded (a workspace's `roots`, or a folder's files),
 * and searches; `expectFound` retries an empty result.
 */
async function search(port: number, query: string, roots: number | null, expectFound: boolean): Promise<{ page: Page; results: string }> {
  await codeServer(port);
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`http://127.0.0.1:${port}/?${query}`);
  await page.locator(".monaco-workbench").waitFor({ timeout: 60_000 });
  // Search covers only the roots the editor has loaded, which it does after the page appears
  await page.keyboard.press("Control+Shift+E");
  const rows = page.locator(".explorer-folders-view .monaco-list-row[aria-level='1']");
  if (roots === null) await rows.first().waitFor({ timeout: 30_000 });
  else await expect(rows).toHaveCount(roots, { timeout: 30_000 });
  await page.keyboard.press("Control+Shift+F");
  await page.keyboard.type("zebracorn42");
  let results = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    await page.locator(".search-view .messages, .search-view .monaco-list-row").first().waitFor({ timeout: 30_000 });
    await page.waitForTimeout(1500);
    results = await page.locator(".search-view").innerText();
    if (!expectFound || results.includes("token.ts")) break;
    await page.keyboard.press("Enter"); // search again
  }
  return { page, results };
}

test("opening the folder alone, search misses the child repo (what the workspace file is for)", async () => {
  const { page, results } = await search(7401, `folder=${folder}`, null, false);
  expect(results).not.toContain("token.ts");
  await page.close();
}, 120_000);

test("opening the workspace file, search finds it, and each repo is a root of its own", async () => {
  const { page, results } = await search(7402, `workspace=${join(folder, "shop.code-workspace")}`, 3, true);
  expect(results).toContain("token.ts");
  await page.keyboard.press("Control+Shift+E");
  const roots = page.locator(".explorer-folders-view .monaco-list-row[aria-level='1']");
  await expect(roots).toHaveText([/shop/i, /api/i, /web/i]);
  await page.close();
}, 120_000);
