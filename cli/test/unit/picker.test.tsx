import { expect, test } from "bun:test";
import { render } from "ink-testing-library";
import type { Project } from "../../projects";
import { Picker, type Choice } from "../../ui/picker";

const project = (name: string, extra: Partial<Project> = {}): Project => ({
  name,
  folder: `/Users/me/dev/${name}`,
  managed: false,
  container: null,
  legacy: null,
  outdated: false,
  ...extra,
});

const running = { name: "orca-a", running: true, startedAt: 1, image: "x", labels: {}, workspace: null, home: null, networks: [], memory: 0, cpus: 0 };
const DOWN = "\u001B[B";
const tick = () => new Promise((r) => setTimeout(r, 20));

function setup(projects: Project[]) {
  const chosen: Choice[] = [];
  const r = render(<Picker projects={projects} home="/Users/me" onChoose={(c) => chosen.push(c)} />);
  return { ...r, chosen };
}

test("shows every project with its state and folder, the first one selected", () => {
  const { lastFrame } = setup([project("a", { container: running }), project("b", { outdated: true })]);
  const frame = lastFrame()!;
  expect(frame).toMatch(/› a\s+● running\s+~\/dev\/a/);
  expect(frame).toMatch(/ {2}b\s+– no container\s+~\/dev\/b\s+⬆ image update/);
  expect(frame).toContain("enter start");
});

test("enter starts the selected project", async () => {
  const { stdin, chosen } = setup([project("a"), project("b")]);
  await tick();
  stdin.write(DOWN);
  await tick();
  stdin.write("\r");
  await tick();
  expect(chosen).toEqual([{ action: "start", project: "b" }]);
});

test("j/k move too, and the selection stops at the ends", async () => {
  const { stdin, chosen } = setup([project("a"), project("b")]);
  await tick();
  for (const k of ["j", "j", "j", "k"]) {
    stdin.write(k);
    await tick();
  }
  stdin.write("\r");
  await tick();
  expect(chosen).toEqual([{ action: "start", project: "a" }]);
});

test("n asks for a new project, d deletes the selected one, q quits", async () => {
  for (const [key, choice] of [
    ["n", { action: "new" }],
    ["d", { action: "delete", project: "a" }],
    ["q", { action: "quit" }],
  ] as const) {
    const { stdin, chosen } = setup([project("a")]);
    await tick();
    stdin.write(key);
    await tick();
    expect(chosen).toEqual([choice]);
  }
});

test("with no projects it says how to make one, and only offers new and quit", () => {
  const frame = setup([]).lastFrame()!;
  expect(frame).toContain("No projects yet");
  expect(frame).toContain("n new");
  expect(frame).not.toContain("enter start");
});
