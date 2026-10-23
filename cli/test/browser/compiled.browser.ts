// The compiled orca's dashboard (what `make build` makes, and users run) in Chromium: its page,
// scripts and styles are bundled into the one file, unlike the source the other tests serve.
// With no Docker to be found, so the result is the same everywhere: the page explains that.
//   ORCA_BIN=dist/orca-<platform> (make browser sets it)
import { afterAll, beforeAll, test } from "bun:test";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, expect, type Browser } from "playwright/test";

const PORT = 7397;
let server: ReturnType<typeof Bun.spawn>;
let browser: Browser;
let link = "";

beforeAll(async () => {
  const bin = process.env.ORCA_BIN;
  if (!bin) throw new Error("Set ORCA_BIN to a compiled orca: make browser does");
  const dir = join(mkdtempSync(join(tmpdir(), "orca-compiled-")), "orca");
  mkdirSync(dir);
  writeFileSync(join(dir, "config.json"), JSON.stringify({ servePort: PORT }));
  // ORCA_ALLOW_IN_CONTAINER: tests may run in a project container. PATH without docker.
  server = Bun.spawn([bin, "serve", "--no-open"], { env: { ORCA_DIR: dir, ORCA_ALLOW_IN_CONTAINER: "1", PATH: "", HOME: dir }, stdout: "pipe", stderr: "inherit" });
  const reader = (server.stdout as ReadableStream<Uint8Array>).getReader();
  let text = "";
  while (!/token=\S+/.test(text)) {
    const { value, done } = await reader.read();
    if (done) throw new Error(`orca serve didn't start:\n${text}`);
    text += new TextDecoder().decode(value);
  }
  link = text.match(/http:\/\/\S+token=\S+/)![0];
  browser = await chromium.launch();
}, 30_000);

afterAll(async () => {
  await browser?.close();
  server?.kill();
});

test("the compiled dashboard loads with its styles, and says Docker can't be reached", async () => {
  const page = await browser.newPage({ colorScheme: "dark" });
  const failed: string[] = [];
  page.on("pageerror", (e) => failed.push(e.message));
  await page.goto(link);
  await expect(page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible();
  // The theme's dark background, so the stylesheet is there and applied
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(background).not.toMatch(/rgba\(0, 0, 0, 0\)|rgb\(255, 255, 255\)/);
  await expect(page.getByText(/docker/i).first()).toBeVisible();
  expect(failed).toEqual([]);
  await page.close();
}, 30_000);
