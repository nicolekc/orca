import { expect, test } from "bun:test";
import { fireEvent, waitFor, within } from "@testing-library/react";
import { open } from "../support/web";

const ID = (n: number) => `${n}1111111-2222-3333-4444-555555555555`;

test("every project's sessions, newest first, each linking to its project", async () => {
  const { screen } = await open("/sessions", [
    { name: "app", sessions: [{ id: ID(1), title: "Fix login", updated: Date.now() - 7200_000 }] },
    { name: "web", sessions: [{ id: ID(2), title: "Add search", updated: Date.now() - 60_000 }] },
  ]);
  await screen.findByText("Fix login");
  const rows = screen.getAllByRole("row").slice(1);
  expect(rows.map((r) => r.textContent)).toEqual([expect.stringContaining("Add search"), expect.stringContaining("Fix login")]);
  expect(within(rows[0]).getByRole("link", { name: "web" }).getAttribute("href")).toBe("#/p/web");
});

test("Resume continues a session in a terminal", async () => {
  const { screen, launched } = await open("/sessions", [{ name: "app", sessions: [{ id: ID(1), title: "Fix login", updated: Date.now() }] }]);
  fireEvent.click(await screen.findByRole("button", { name: "Resume" }));
  await waitFor(() => expect(launched.length).toBe(1));
  expect(launched[0].join(" ")).toContain(`claude --resume ${ID(1)}`);
});

test("no sessions yet says so", async () => {
  const { screen } = await open("/sessions", [{ name: "app" }]);
  expect(await screen.findByText("No Claude sessions in any project yet.")).toBeTruthy();
});

test("the header: where each tab goes, which is current, and the proxy and version", async () => {
  const { screen } = await open("/sessions", [{ name: "app" }]);
  expect(await screen.findByText(/Forwards proxy off on 127\.0\.0\.1:7320 · test/)).toBeTruthy();
  expect(screen.getByRole("link", { name: "Sessions" }).getAttribute("aria-current")).toBe("page");
  expect(screen.getByRole("link", { name: "Projects" }).getAttribute("aria-current")).toBeNull();
});

test("an action that fails shows what went wrong and how to fix it", async () => {
  const { screen } = await open("/sessions", [{ name: "app", sessions: [{ id: ID(1), title: "Fix login", updated: Date.now() }] }], {
    respond: (path) => (path.endsWith("/open") ? Response.json({ error: "Docker isn't running.", fix: "Start Docker Desktop." }, { status: 400 }) : undefined),
  });
  fireEvent.click(await screen.findByRole("button", { name: "Resume" }));
  expect(await screen.findByText("Docker isn't running.")).toBeTruthy();
  expect(screen.getByText("Start Docker Desktop.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
  expect(screen.queryByText("Docker isn't running.")).toBeNull();
});
