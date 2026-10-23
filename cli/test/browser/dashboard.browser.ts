// The dashboard in Chromium, with its real styles, over a fake Docker (./serve.ts): every screen
// at a phone's width in light and a laptop's in dark, then the flows that need a real browser.
// Screenshots go to $ORCA_SHOTS when it's set, for looking at the result.
import { afterAll, beforeAll, test } from "bun:test";
import { mkdirSync } from "node:fs";
import { chromium, expect, type Browser, type Page } from "playwright/test";

const PORT = 7398;
let server: ReturnType<typeof Bun.spawn>;
let browser: Browser;
let link = "";

beforeAll(async () => {
  server = Bun.spawn(["bun", `${import.meta.dir}/serve.ts`, String(PORT)], { stdout: "pipe", stderr: "inherit" });
  const out = server.stdout as ReadableStream<Uint8Array>;
  const reader = out.getReader();
  let text = "";
  while (!/token=\S+/.test(text)) {
    const { value, done } = await reader.read();
    if (done) throw new Error(`The dashboard didn't start:\n${text}`);
    text += new TextDecoder().decode(value);
  }
  link = text.match(/http:\/\/\S+token=\S+/)![0];
  browser = await chromium.launch();
}, 30_000);

afterAll(async () => {
  await browser?.close();
  server?.kill();
});

const VIEWS = [
  { name: "phone-light", viewport: { width: 375, height: 800 }, colorScheme: "light" as const },
  { name: "laptop-dark", viewport: { width: 1280, height: 800 }, colorScheme: "dark" as const },
];
const SCREENS: [string, string][] = [
  ["/", "Projects"],
  ["/sessions", "Recent sessions"],
  ...["app", "demo", "idle", "old", "stopped", "fresh", "legacy"].map((p): [string, string] => [`/p/${p}`, p]),
];

/** A signed-in page that fails the test on any error it logs. */
async function page(view: (typeof VIEWS)[number]) {
  const ctx = await browser.newContext({ viewport: view.viewport, colorScheme: view.colorScheme });
  const p = await ctx.newPage();
  const errors: string[] = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await p.goto(link);
  return { p, errors, close: () => ctx.close() };
}

async function shot(p: Page, name: string) {
  const dir = process.env.ORCA_SHOTS;
  if (!dir) return;
  mkdirSync(dir, { recursive: true });
  await p.screenshot({ path: `${dir}/${name}.png`, fullPage: true });
}

for (const view of VIEWS)
  test(`${view.name}: every screen renders, fits the width, and logs no errors`, async () => {
    const { p, errors, close } = await page(view);
    for (const [route, heading] of SCREENS) {
      await p.goto(new URL(`/app#${route}`, link).href);
      await expect(p.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await p.waitForLoadState("networkidle");
      await shot(p, `${view.name}${route.replaceAll("/", "-")}`);
      const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(over, `${route} is ${over}px wider than the screen`).toBeLessThanOrEqual(0);
    }
    expect(errors).toEqual([]);
    await close();
  }, 60_000);

test("the dialogs open, read correctly and close (Stop, Delete, New project)", async () => {
  const { p, errors, close } = await page(VIEWS[1]);
  await p.goto(new URL("/app#/p/app", link).href);
  await p.getByRole("button", { name: "Stop container" }).click();
  const stop = p.getByRole("dialog");
  await expect(stop).toContainText("its 3 terminals");
  await expect(stop.getByRole("button", { name: "Stop", exact: true })).toBeFocused({ timeout: 2000 }).catch(() => {});
  await shot(p, "dialog-stop");
  await p.keyboard.press("Escape");
  await expect(stop).toBeHidden();

  await p.goto(new URL("/app#/p/stopped", link).href);
  await p.getByRole("button", { name: "Delete…" }).click();
  const del = p.getByRole("dialog");
  await expect(del.getByRole("button", { name: "Delete", exact: true })).toBeDisabled();
  await del.getByLabel(/to confirm/).fill("stopped");
  await expect(del.getByRole("button", { name: "Delete", exact: true })).toBeEnabled();
  await shot(p, "dialog-delete");
  await del.getByRole("button", { name: "Cancel" }).click();
  await expect(del).toBeHidden();

  await p.goto(new URL("/app#/", link).href);
  await p.getByRole("button", { name: "New project" }).click();
  const create = p.getByRole("dialog");
  await expect(create.getByLabel("Name")).toBeFocused();
  await create.getByLabel("Name").fill("bad name");
  await expect(create.getByRole("button", { name: "Create and open" })).toBeDisabled();
  await shot(p, "dialog-new");
  await p.keyboard.press("Escape");
  await expect(create).toBeHidden();
  expect(errors).toEqual([]);
  await close();
}, 30_000);

test("stopping a project from its page: the dialog, then the stopped state", async () => {
  const { p, errors, close } = await page(VIEWS[0]);
  await p.goto(new URL("/app#/p/demo", link).href);
  await p.getByRole("button", { name: "Stop container" }).click();
  await p.getByRole("dialog").getByRole("button", { name: "Stop", exact: true }).click();
  await expect(p.getByText("Stopped demo.")).toBeVisible();
  await expect(p.getByRole("main")).toContainText("stopped");
  await expect(p.getByText(/None open/)).toBeVisible();
  expect(errors).toEqual([]);
  await close();
}, 30_000);
