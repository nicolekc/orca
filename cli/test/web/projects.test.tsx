import { expect, test } from "bun:test";
import { fireEvent, within } from "@testing-library/react";
import { gone, open } from "../support/web";

const row = async (screen: Awaited<ReturnType<typeof open>>["screen"], name: string) =>
  (await screen.findByRole("link", { name })).closest("tr") as HTMLElement;

test("each project's state, open terminals, image update and forwards", async () => {
  const { screen } = await open("/", [
    { name: "app", container: "running", terminals: [["1", "claude"], ["2", "bash"]], forwards: [3000] },
    { name: "old", container: "stopped", outdated: true },
    { name: "fresh", container: "none" },
  ]);
  const app = await row(screen, "app");
  expect(app.textContent).toContain("running");
  expect(app.textContent).toContain("2 terminals");
  expect(within(app).getByRole("link", { name: ":3000" }).getAttribute("href")).toBe("http://3000.app.localhost:7320");
  expect((await row(screen, "old")).textContent).toContain("image update");
  expect((await row(screen, "fresh")).textContent).toContain("no container");
});

test("a project not migrated yet points to its page, not Open", async () => {
  const { screen } = await open("/", [{ name: "legacy", notMigrated: true }]);
  const r = await row(screen, "legacy");
  expect(within(r).getByText("Migrate first")).toBeTruthy();
  expect(within(r).queryByRole("button", { name: /Open/ })).toBeNull();
});

test("Open starts a terminal on the Mac and says so", async () => {
  const { screen, launched } = await open("/", [{ name: "app", container: "running" }]);
  fireEvent.click(within(await row(screen, "app")).getByRole("button", { name: /Open/ }));
  await screen.findByText(/in a terminal|Opening/);
  expect(launched[0].join(" ")).toContain("start");
  expect(launched[0].join(" ")).toContain("--new");
});

test("no projects: says how to make one", async () => {
  const { screen } = await open("/", []);
  expect(await screen.findByText("No projects yet.")).toBeTruthy();
});

test("New project checks the name, then creates it and opens it", async () => {
  const { screen, launched, requests } = await open("/", [{ name: "app" }]);
  fireEvent.click(await screen.findByRole("button", { name: /New project/ }));
  const name = await screen.findByLabelText("Name");
  const create = screen.getByRole("button", { name: "Create and open" }) as HTMLButtonElement;
  expect(create.disabled).toBe(true);

  fireEvent.input(name, { target: { value: "bad name" } });
  expect(name.getAttribute("aria-invalid")).toBe("true");
  expect(create.disabled).toBe(true);

  fireEvent.input(name, { target: { value: "shop" } });
  expect(screen.getByText(/projects\/shop\/workspace/)).toBeTruthy();
  fireEvent.click(create);
  await gone(() => screen.queryByRole("dialog"));
  expect(requests.some((r) => r.method === "POST" && r.path === "/api/projects" && (r.body as { name: string }).name === "shop")).toBe(true);
  expect(launched[0].join(" ")).toContain("projects/shop/workspace");
});

test("a signed-out page says to open it again from orca serve", async () => {
  const { screen } = await open("/", [{ name: "app" }], { respond: () => Response.json({ error: "Unauthorized" }, { status: 401 }) });
  expect(await screen.findByText("This dashboard needs a fresh link.")).toBeTruthy();
});
