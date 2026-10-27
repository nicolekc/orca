import { expect, test } from "bun:test";
import { fireEvent, waitFor, within } from "@testing-library/react";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { gone, open } from "../support/web";

const section = async (screen: Awaited<ReturnType<typeof open>>["screen"], title: string) =>
  (await screen.findByRole("heading", { name: title })).closest("section") as HTMLElement;
const type = (el: HTMLElement, value: string) => fireEvent.input(el, { target: { value } });

test("a running project's terminals: what runs in each, and Attach opens that one", async () => {
  const { screen, launched } = await open("/p/app", [
    { name: "app", container: "running", terminals: [["1", "claude", "✳ Fix login", true], ["2", "bash"]] },
  ]);
  const terminals = await section(screen, "Terminals");
  const rows = within(terminals).getAllByRole("listitem");
  expect(rows.map((r) => r.textContent)).toEqual([expect.stringContaining("✳ Fix login"), expect.stringContaining("bash")]);
  expect(rows[0].textContent).toContain("in a window");

  fireEvent.click(within(rows[1]).getByRole("button", { name: "Attach" }));
  await waitFor(() => expect(launched.length).toBe(1));
  expect(launched[0].join(" ")).toContain("--terminal 2");
});

test("New terminal opens one more", async () => {
  const { screen, launched } = await open("/p/app", [{ name: "app", container: "running" }]);
  fireEvent.click(await screen.findByRole("button", { name: /New terminal/ }));
  await waitFor(() => expect(launched.length).toBe(1));
  expect(launched[0].join(" ")).toContain("--new");
});

test("Stop lists the terminals it ends; Cancel leaves it running, Stop stops it", async () => {
  const { screen, state } = await open("/p/app", [{ name: "app", container: "running", terminals: [["1", "claude", "Fix login"], ["2", "bash"]] }]);
  fireEvent.click(await screen.findByRole("button", { name: "Stop container" }));
  let dialog = await screen.findByRole("dialog");
  expect(dialog.textContent).toContain("Stop app?");
  expect(dialog.textContent).toContain("its 2 terminals");
  expect(dialog.textContent).toContain("Fix login");
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  await gone(() => screen.queryByRole("dialog"));
  expect(state.containers[0].running).toBe(true);

  fireEvent.click(screen.getByRole("button", { name: "Stop container" }));
  dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Stop" }));
  await screen.findByText("Stopped app.");
  expect(state.containers[0].running).toBe(false);
  expect(await screen.findByText(/None open/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Stop container" })).toBeNull();
});

test("with no terminals open, Stop doesn't ask", async () => {
  const { screen, state } = await open("/p/app", [{ name: "app", container: "running" }]);
  fireEvent.click(await screen.findByRole("button", { name: "Stop container" }));
  await screen.findByText("Stopped app.");
  expect(state.containers[0].running).toBe(false);
});

test("the terminals say when it stops; Keep running keeps it up until stopped", async () => {
  const { screen, state } = await open("/p/app", [{ name: "app", container: "running" }]);
  const terminals = await section(screen, "Terminals");
  expect(await within(terminals).findByText("It stops when its last terminal ends.")).toBeTruthy();
  fireEvent.click(within(terminals).getByRole("button", { name: "Keep running" }));
  await screen.findByText(/app is up/);
  expect(state.containers[0].up).toBe(true);
  expect(await within(terminals).findByText(/Kept up: it runs until you stop it/)).toBeTruthy();
  expect(within(terminals).queryByRole("button", { name: "Keep running" })).toBeNull();
});

test("a stopped project can start without a terminal, kept up", async () => {
  const { screen, state, launched } = await open("/p/app", [{ name: "app", container: "stopped" }]);
  fireEvent.click(await screen.findByRole("button", { name: "Start without a terminal" }));
  await screen.findByText(/app is up/);
  expect(state.containers[0]).toMatchObject({ running: true, up: true });
  expect(launched).toEqual([]);
});

test("limits: change memory and CPUs at once, then go back to the defaults", async () => {
  const { screen, state } = await open("/p/app", [{ name: "app", container: "running" }]);
  const limits = await section(screen, "Limits");
  const memory = (await within(limits).findByLabelText("Memory, GB")) as HTMLInputElement;
  expect(memory.value).toBe("8");
  expect(within(limits).getByText(/The defaults · Changes apply at once/)).toBeTruthy();
  type(memory, "12");
  fireEvent.click(within(limits).getByRole("button", { name: "Save" }));
  await screen.findByText(/app now has 12 GB of memory/);
  expect(state.containers[0].memory).toBe(12 * 1024 ** 3);
  expect(await within(limits).findByText(/Its own memory, the default CPUs/)).toBeTruthy();

  fireEvent.click(within(limits).getByRole("button", { name: "Use the defaults" }));
  await screen.findByText(/app now has 8 GB of memory/);
  expect(state.containers[0].memory).toBe(8 * 1024 ** 3);
});

test("a container from before terminals says so, and Stop asks, since it ends any open shells", async () => {
  const { screen } = await open("/p/app", [{ name: "app", container: "running", old: true }]);
  expect(await screen.findByText(/from before terminals/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Stop container" }));
  expect((await screen.findByRole("dialog")).textContent).toContain("any shells open in it");
});

test("forwards: add one, see its address, remove it; a bad port says why", async () => {
  const { screen } = await open("/p/app", [{ name: "app", container: "running" }]);
  const forwards = await section(screen, "Forwards");
  const port = within(forwards).getByLabelText("Port to forward");
  type(port, "3000");
  fireEvent.click(within(forwards).getByRole("button", { name: "Forward" }));
  expect(await within(forwards).findByRole("link", { name: "http://3000.app.localhost:7320" })).toBeTruthy();
  expect((port as HTMLInputElement).value).toBe("");

  fireEvent.click(within(forwards).getByRole("button", { name: "Stop forwarding port 3000" }));
  await gone(() => within(forwards).queryByRole("link", { name: /3000/ }));

  type(port, "99999");
  fireEvent.click(within(forwards).getByRole("button", { name: "Forward" }));
  expect(await screen.findByText(/99999/)).toBeTruthy();
});

test("an image update: what's kept and reset, and Recreate waits until it's stopped", async () => {
  const { screen, launched } = await open("/p/app", [{ name: "app", container: "running", outdated: true }]);
  expect(await screen.findByText("Image update available")).toBeTruthy();
  expect(screen.getByText(/built .*; the newest/)).toBeTruthy();
  const recreate = screen.getByRole("button", { name: "Recreate in Terminal" }) as HTMLButtonElement;
  expect(recreate.disabled).toBe(true);

  fireEvent.click(screen.getByRole("button", { name: "Stop container" }));
  await waitFor(() => expect(recreate.disabled).toBe(false));
  fireEvent.click(recreate);
  await waitFor(() => expect(launched.length).toBe(1));
  expect(launched[0].join(" ")).toContain("--fresh");
});

test("delete waits until it's stopped, then for the project's name; the home stays unless chosen", async () => {
  const { screen, state, ctx } = await open("/p/app", [{ name: "app", container: "stopped" }]);
  fireEvent.click(await screen.findByRole("button", { name: "Delete…" }));
  const dialog = await screen.findByRole("dialog");
  const confirm = within(dialog).getByRole("button", { name: "Delete" }) as HTMLButtonElement;
  expect(confirm.disabled).toBe(true);
  type(within(dialog).getByLabelText(/to confirm/), "ap");
  expect(confirm.disabled).toBe(true);
  type(within(dialog).getByLabelText(/to confirm/), "app");
  expect(confirm.disabled).toBe(false);
  fireEvent.click(confirm);
  await gone(() => screen.queryByRole("dialog"));
  expect(state.containers).toHaveLength(0);
  expect(existsSync(join(ctx.orcaDir, "projects/app/home"))).toBe(true);
});

test("delete is unavailable while it runs", async () => {
  const { screen } = await open("/p/app", [{ name: "app", container: "running" }]);
  expect((await screen.findByRole("button", { name: "Delete…" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getAllByText("Stop it first.").length).toBeGreaterThan(0);
});

test("a project not migrated yet shows how to migrate it, and nothing that needs its container", async () => {
  const { screen } = await open("/p/legacy", [{ name: "legacy", notMigrated: true }]);
  expect(await screen.findByText(/orca-migrate\.sh/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: /New terminal/ })).toBeNull();
  expect(screen.queryByRole("heading", { name: "Terminals" })).toBeNull();
});

test("Claude sessions: Resume continues one in a terminal", async () => {
  const { screen, launched } = await open("/p/app", [
    { name: "app", container: "stopped", sessions: [{ id: "11111111-2222-3333-4444-555555555555", title: "Fix login", updated: Date.now() - 3600_000 }] },
  ]);
  const sessions = await section(screen, "Claude sessions");
  expect(within(sessions).getByText("Fix login")).toBeTruthy();
  fireEvent.click(within(sessions).getByRole("button", { name: "Resume" }));
  await waitFor(() => expect(launched.length).toBe(1));
  expect(launched[0].join(" ")).toContain("claude --resume 11111111-2222-3333-4444-555555555555");
});

test("an unknown project says so, naming the real ones", async () => {
  const { screen } = await open("/p/nope", [{ name: "app" }]);
  expect(await screen.findByText(/no project named "nope"/)).toBeTruthy();
  expect(screen.getByText(/Projects: app/)).toBeTruthy();
});
