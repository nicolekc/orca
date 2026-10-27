import { expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { limits } from "../../commands/limits";
import { start } from "../../commands/start";
import { formatMemory, parseCpus, parseMemory } from "../../limits";
import { fakeContext } from "../support/fake";

const GB = 1024 ** 3;

function project(t: ReturnType<typeof fakeContext>, name = "app", container: { running?: boolean } | null = { running: true }) {
  const folder = join(t.home, "dev", name);
  mkdirSync(folder, { recursive: true });
  const record = join(t.ctx.orcaDir, "projects", name);
  mkdirSync(join(record, "home"), { recursive: true });
  writeFileSync(join(record, "project-path"), folder + "\n");
  if (container) t.state.containers.push({ name: `orca-${name}`, labels: { "orca.terminals": "1", "orca.up": "1" }, workspace: folder, home: join(record, "home"), ...container });
  return { folder, record };
}
const config = (t: ReturnType<typeof fakeContext>) => JSON.parse(readFileSync(join(t.ctx.orcaDir, "config.json"), "utf8"));

test("memory and CPUs are read the ways people write them, and nonsense says what works", () => {
  expect(parseMemory("12g")).toBe(12 * GB);
  expect(parseMemory("12GB")).toBe(12 * GB);
  expect(parseMemory("1.5 GiB")).toBe(1.5 * GB);
  expect(parseMemory("512m")).toBe(512 * 1024 ** 2);
  expect(() => parseMemory("12")).toThrow(/isn't an amount of memory/);
  expect(() => parseMemory("100m")).toThrow(/isn't an amount of memory/);
  expect(parseCpus("1.5")).toBe(1.5);
  expect(() => parseCpus("six")).toThrow(/isn't a number of CPUs/);
  expect(formatMemory(12 * GB)).toBe("12 GB");
  expect(formatMemory(512 * 1024 ** 2)).toBe("512 MB");
});

test("setting a project's limits changes its container at once, without recreating it, and keeps them", async () => {
  const t = fakeContext();
  const { record } = project(t);
  await limits(t.ctx, "app", { memory: "12g", cpus: "6" });
  expect(t.calls).toContainEqual(["update", `--memory=${12 * GB}`, `--memory-swap=${24 * GB}`, "--cpus=6", "orca-app"]);
  expect(t.calls.some((c) => c[0] === "rm" || c[0] === "run")).toBe(false);
  expect(t.state.containers[0]).toMatchObject({ running: true, memory: 12 * GB, cpus: 6 });
  expect(t.output()).toContain("app now has 12 GB of memory, 6 CPUs (was 8 GB of memory, 4 CPUs).");
  expect(JSON.parse(readFileSync(join(record, "limits.json"), "utf8"))).toEqual({ memory: 12 * GB, cpus: 6 });
});

test("showing them says where each comes from, what it uses now, and what Docker has in all", async () => {
  const t = fakeContext();
  project(t);
  t.state.containers[0].used = "2.1GiB";
  await limits(t.ctx, "app", { memory: "12g" });
  await limits(t.ctx, "app", {});
  expect(t.output()).toContain("app: 12 GB of memory (its own), 4 CPUs (orca's default)");
  expect(t.output()).toContain("Using 2.1GiB of memory now.");
  expect(t.output()).toContain("Docker has 16 GB and 10 CPUs in all, shared by every container.");
});

test('"default" goes back to the defaults', async () => {
  const t = fakeContext();
  const { record } = project(t);
  await limits(t.ctx, "app", { memory: "12g" });
  await limits(t.ctx, "app", { memory: "default" });
  expect(t.state.containers[0].memory).toBe(8 * GB);
  expect(existsSync(join(record, "limits.json"))).toBe(false);
});

test("new defaults go into config.json, keeping its other settings, and reach every project that follows them", async () => {
  const t = fakeContext();
  mkdirSync(t.ctx.orcaDir, { recursive: true });
  writeFileSync(join(t.ctx.orcaDir, "config.json"), JSON.stringify({ proxyPort: 7400 }));
  project(t, "app");
  project(t, "big");
  project(t, "new", null);
  await limits(t.ctx, "big", { memory: "14g" });
  await limits(t.ctx, null, { defaults: true, memory: "10g", cpus: "5" });
  expect(config(t)).toEqual({ proxyPort: 7400, memory: "10g", cpus: 5 });
  expect(t.state.containers.find((c) => c.name === "orca-app")).toMatchObject({ memory: 10 * GB, cpus: 5 });
  // big keeps its own memory, and takes the new CPUs
  expect(t.state.containers.find((c) => c.name === "orca-big")).toMatchObject({ memory: 14 * GB, cpus: 5 });
  expect(t.output()).toContain("Defaults, for projects without their own: 10 GB of memory, 5 CPUs");
  expect(t.output()).toContain("new gets 10 GB of memory, 5 CPUs when its container is made.");
});

test("more CPUs than Docker has is refused; more memory is allowed, with a warning", async () => {
  const t = fakeContext();
  project(t);
  await expect(limits(t.ctx, "app", { cpus: "12" })).rejects.toMatchObject({ message: "Docker has 10 CPUs, so a container can't have 12." });
  await limits(t.ctx, "app", { memory: "20g" });
  expect(t.output()).toContain("more memory than Docker has (16 GB)");
});

test("a container made later gets the limits, and start brings an existing one up to date", async () => {
  const t = fakeContext();
  const { folder } = project(t, "app", null);
  await limits(t.ctx, "app", { memory: "12g", cpus: "6" });
  await start(t.ctx, folder, { up: true });
  const run = t.calls.find((c) => c[0] === "run")!;
  expect(run).toContain(`--memory=${12 * GB}`);
  expect(run).toContain("--cpus=6");

  // Changed by hand (docker update), or defaults that changed while it was stopped
  t.state.containers[0].memory = 8 * GB;
  await start(t.ctx, folder, { up: true });
  expect(t.state.containers[0].memory).toBe(12 * GB);
  expect(t.output()).toContain("Limits: 12 GB of memory, 6 CPUs (was 8 GB of memory, 6 CPUs)");
});

test("limits needs a project, and --defaults takes none", async () => {
  const t = fakeContext();
  project(t);
  await expect(limits(t.ctx, null, {})).rejects.toMatchObject({ message: "This folder isn't in a project." });
  await expect(limits(t.ctx, "nope", {})).rejects.toMatchObject({ message: 'There\'s no project named "nope".' });
  await expect(limits(t.ctx, "app", { defaults: true })).rejects.toMatchObject({ message: expect.stringContaining("takes no project") });
});
