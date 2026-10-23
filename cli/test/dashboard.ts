// The dashboard in a real browser, as the e2e test leaves it: a running project with one open
// terminal running `command`. Checks the list and the project's page show the terminal, then
// stops the project from its page.
//   bun cli/test/dashboard.ts <dashboard link with token> <project> <command>
// On failure, leaves dashboard-failure.png in the current folder.
import { chromium, expect } from "playwright/test";

const [link, project, command] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage();
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

try {
  await page.goto(link);
  const row = page.getByRole("row").filter({ has: page.getByRole("link", { name: project, exact: true }) });
  await expect(row).toContainText("running");
  await expect(row).toContainText("1 terminal");

  await fitsPhone();

  await row.getByRole("link", { name: project, exact: true }).click();
  await expect(page.getByRole("heading", { name: project })).toBeVisible();
  await fitsPhone();
  const terminals = page.getByRole("listitem").filter({ hasText: command });
  await expect(terminals).toHaveCount(1);
  await expect(terminals.getByRole("button", { name: "Attach" })).toBeVisible();

  await page.getByRole("button", { name: "Stop container" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText(`Stop ${project}?`);
  await expect(dialog).toContainText("its terminal");
  await expect(dialog).toContainText(command);
  await dialog.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 30_000 });
  await expect(page.getByText(`Stopped ${project}.`)).toBeVisible();
  await expect(page.getByText("Stopping")).toHaveCount(0);
  await expect(page.getByRole("main")).toContainText("stopped");
  await expect(page.getByText(/None open/)).toBeVisible();

  if (errors.length) throw new Error(`The page reported errors:\n${errors.join("\n")}`);
  console.log("dashboard: the list and project page show the terminal; Stop stopped it");
} catch (e) {
  await page.screenshot({ path: "dashboard-failure.png", fullPage: true });
  throw e;
} finally {
  await browser.close();
}

/** At a phone's width, the page doesn't scroll sideways. */
async function fitsPhone() {
  const size = page.viewportSize()!;
  await page.setViewportSize({ width: 375, height: 800 });
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await page.setViewportSize(size);
  if (wide > 0) throw new Error(`At phone width, ${page.url()} is ${wide}px wider than the screen`);
}
