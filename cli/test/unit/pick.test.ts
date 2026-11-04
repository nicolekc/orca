import { expect, test } from "bun:test";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { act } from "../../commands/pick";
import { loadProjects } from "../../projects";
import { fakeContext } from "../support/fake";

const T = { "orca.terminals": "1", "orca.up": "1" };

/** A project "app" in ~/dev/app with a home, its container on an older image than the newest. */
function outdated(answers: (string | null)[], running = false, terminals: string[] = []) {
  const t = fakeContext({ latest: "sha256:new" }, answers);
  const folder = join(t.home, "dev/app");
  const record = join(t.ctx.orcaDir, "projects/app");
  mkdirSync(folder, { recursive: true });
  mkdirSync(join(record, "home"), { recursive: true });
  writeFileSync(join(record, "project-path"), folder + "\n");
  t.state.containers.push({ name: "orca-app", running, image: "sha256:old", labels: T, workspace: folder, home: join(record, "home"), terminals });
  return { ...t, record };
}

const term = (name: string) => `${name}|0|0|claude|host|host`;

test("update recreates a stopped container on the newest image, saying what that keeps", async () => {
  const t = outdated(["unused"]);
  await act(t.ctx, await loadProjects(t.ctx), { action: "update", project: "app" });
  expect(t.calls).toContainEqual(["rm", "orca-app"]);
  expect(t.calls.find((c) => c[0] === "run")).toContain("orca:latest");
  expect(t.output()).toMatch(/Kept:.*~/);
});

test("update stops a running container first, asking when that ends terminals", async () => {
  const t = outdated(["y"], true, [term("1")]);
  await act(t.ctx, await loadProjects(t.ctx), { action: "update", project: "app" });
  expect(t.output()).toContain("Stopping app ends its terminal");
  expect(t.calls).toContainEqual(["stop", "orca-app"]);
  expect(t.calls).toContainEqual(["rm", "orca-app"]);
});

test("update does nothing when stopping is declined", async () => {
  const t = outdated(["n"], true, [term("1")]);
  await act(t.ctx, await loadProjects(t.ctx), { action: "update", project: "app" });
  expect(t.calls.some((c) => c[0] === "rm")).toBe(false);
});

test("delete asks whether to delete the home too, then deletes what was chosen", async () => {
  const t = outdated(["home", "app"]);
  await act(t.ctx, await loadProjects(t.ctx), { action: "delete", project: "app" });
  expect(t.output()).toContain("Delete the container and its home");
  expect(t.state.containers).toHaveLength(0);
  expect(existsSync(t.record)).toBe(false);
});

test("delete can keep the home", async () => {
  const t = outdated(["container", "app"]);
  await act(t.ctx, await loadProjects(t.ctx), { action: "delete", project: "app" });
  expect(t.state.containers).toHaveLength(0);
  expect(existsSync(join(t.record, "home"))).toBe(true);
});

test("delete with no container goes straight to deleting the home", async () => {
  const t = outdated(["app"]);
  t.state.containers.length = 0;
  await act(t.ctx, await loadProjects(t.ctx), { action: "delete", project: "app" });
  expect(existsSync(t.record)).toBe(false);
});

test("quitting the delete question deletes nothing", async () => {
  const t = outdated([null]);
  await act(t.ctx, await loadProjects(t.ctx), { action: "delete", project: "app" });
  expect(t.state.containers).toHaveLength(1);
  expect(existsSync(t.record)).toBe(true);
});
