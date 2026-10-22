import { expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { start } from "../commands/start";
import { fakeContext } from "./fake";

function folder(home: string, name = "app") {
  const dir = join(home, "dev", name);
  mkdirSync(dir, { recursive: true });
  return dir;
}

test("a new folder gets a record and a container with its folder, home and node_modules", async () => {
  const t = fakeContext();
  const dir = folder(t.home);
  await start(t.ctx, dir, {});
  const record = join(t.ctx.orcaDir, "projects/app");
  expect(readFileSync(join(record, "project-path"), "utf8").trim()).toBe(dir);
  expect(existsSync(join(record, "home"))).toBe(true);
  const run = t.attached[0];
  expect(run.slice(0, 4)).toEqual(["run", "-it", "--name", "orca-app"]);
  expect(run).toContain("orca.project=app");
  expect(run).toContain(`${dir}:/workspace`);
  expect(run).toContain("orca-app_node_modules:/workspace/node_modules");
  expect(run).toContain(`${join(record, "home")}:/home/node`);
  expect(run.slice(-2)).toEqual(["orca:latest", "bash"]);
});

test("a stopped container is resumed", async () => {
  const t = fakeContext();
  const dir = folder(t.home);
  await start(t.ctx, dir, {});
  t.state.containers.push({ name: "orca-app", workspace: dir, home: join(t.ctx.orcaDir, "projects/app/home") });
  await start(t.ctx, dir, {});
  expect(t.attached[1]).toEqual(["start", "-ai", "orca-app"]);
});

test("a running container gets a second shell instead of sharing the first one", async () => {
  const t = fakeContext();
  const dir = folder(t.home);
  await start(t.ctx, dir, {});
  t.state.containers.push({ name: "orca-app", running: true, workspace: dir, home: join(t.ctx.orcaDir, "projects/app/home") });
  await start(t.ctx, dir, {});
  expect(t.attached[1]).toEqual(["exec", "-it", "orca-app", "bash"]);
  expect(t.output()).toContain("already running");
});

test("an out-of-date container says what recreating keeps and loses, then resumes", async () => {
  const t = fakeContext({ latest: "sha256:new", created: { "sha256:old": "2026-09-02T09:15:00Z", "sha256:new": "2026-10-21T18:30:00Z" } });
  const dir = folder(t.home);
  await start(t.ctx, dir, {});
  t.state.containers.push({ name: "orca-app", image: "sha256:old", workspace: dir, home: join(t.ctx.orcaDir, "projects/app/home") });
  await start(t.ctx, dir, {});
  const out = t.output();
  expect(out).toContain("Image update available");
  expect(out).toContain("2026-09-02");
  expect(out).toContain("orca start --fresh");
  expect(out).toMatch(/Kept:.*~/);
  expect(out).toContain("Reset:");
  expect(t.attached[1]).toEqual(["start", "-ai", "orca-app"]);
});

test("the update notice leaves out build dates that can't tell the images apart", async () => {
  const t = fakeContext({ latest: "sha256:new", created: { "sha256:old": "2026-10-21T22:08:00Z", "sha256:new": "2026-10-21T22:08:30Z" } });
  const dir = folder(t.home);
  await start(t.ctx, dir, {});
  t.state.containers.push({ name: "orca-app", image: "sha256:old", workspace: dir, home: join(t.ctx.orcaDir, "projects/app/home") });
  await start(t.ctx, dir, {});
  expect(t.output()).toContain("made from an older orca image");
  expect(t.output()).not.toContain("22:08");
});

test("--fresh recreates a stopped container", async () => {
  const t = fakeContext();
  const dir = folder(t.home);
  await start(t.ctx, dir, {});
  t.state.containers.push({ name: "orca-app", workspace: dir, home: join(t.ctx.orcaDir, "projects/app/home") });
  await start(t.ctx, dir, { fresh: true });
  expect(t.calls).toContainEqual(["rm", "orca-app"]);
  expect(t.attached[1][0]).toBe("run");
});

test("--fresh refuses while the container is running", async () => {
  const t = fakeContext();
  const dir = folder(t.home);
  await start(t.ctx, dir, {});
  t.state.containers.push({ name: "orca-app", running: true, workspace: dir, home: join(t.ctx.orcaDir, "projects/app/home") });
  await expect(start(t.ctx, dir, { fresh: true })).rejects.toMatchObject({ message: expect.stringContaining("running") });
  expect(t.calls.some((c) => c[0] === "rm")).toBe(false);
});

test("a different folder with the same name is refused rather than sharing a home", async () => {
  const t = fakeContext();
  await start(t.ctx, folder(t.home, "app"), {});
  const other = join(t.home, "elsewhere/app");
  mkdirSync(other, { recursive: true });
  await expect(start(t.ctx, other, {})).rejects.toMatchObject({ message: expect.stringContaining("belongs to") });
});

test("another running container on the same folder is refused", async () => {
  const t = fakeContext();
  const dir = folder(t.home);
  t.state.containers.push({ name: "someone", running: true, workspace: dir, home: "/elsewhere" });
  await expect(start(t.ctx, dir, {})).rejects.toMatchObject({ message: expect.stringContaining("someone") });
});

test("a folder with a pre-migration container and no migrated home points to the migration", async () => {
  const t = fakeContext();
  const dir = folder(t.home);
  t.state.containers.push({ name: "ralph-app", workspace: dir });
  const err = await start(t.ctx, dir, {}).catch((e) => e);
  expect(err.message).toContain("ralph-app");
  expect(err.fix).toContain("orca-migrate.sh");
  expect(t.attached).toHaveLength(0);
});

test("a migration that didn't finish is refused, with how to redo it", async () => {
  const t = fakeContext();
  const dir = folder(t.home);
  t.state.containers.push({ name: "ralph-app", workspace: dir });
  const home = join(t.ctx.orcaDir, "projects", basename(dir), "home");
  mkdirSync(home, { recursive: true });
  writeFileSync(join(home, ".bashrc"), "");
  const err = await start(t.ctx, dir, {}).catch((e) => e);
  expect(err.message).toContain("didn't finish");
  expect(err.fix).toContain("rm -r");
  expect(t.attached).toHaveLength(0);
});

test("a finished migration starts the new container", async () => {
  const t = fakeContext();
  const dir = folder(t.home);
  t.state.containers.push({ name: "ralph-app", workspace: dir });
  const record = join(t.ctx.orcaDir, "projects", basename(dir));
  mkdirSync(join(record, "home"), { recursive: true });
  writeFileSync(join(record, "home/.bashrc"), "");
  writeFileSync(join(record, "migrated-from"), "ralph-app\n");
  await start(t.ctx, dir, {});
  expect(t.attached).toHaveLength(1);
});

test("a missing image says to run orca update", async () => {
  const t = fakeContext({ latest: null });
  const err = await start(t.ctx, folder(t.home), {}).catch((e) => e);
  expect(err.fix).toContain("orca update");
});

test("a missing folder is reported", async () => {
  const t = fakeContext();
  await expect(start(t.ctx, join(t.home, "nope"), {})).rejects.toMatchObject({ message: expect.stringContaining("doesn't exist") });
});

test("a folder name Docker can't use is reported", async () => {
  const t = fakeContext();
  const err = await start(t.ctx, folder(t.home, "my app"), {}).catch((e) => e);
  expect(err.message).toContain("my app");
});

test("a command runs in a new container, which keeps running in the background", async () => {
  const t = fakeContext();
  const dir = folder(t.home);
  await start(t.ctx, dir, { command: ["claude", "--resume", "abc"] });
  const run = t.calls.find((c) => c[0] === "run")!;
  expect(run.slice(0, 3)).toEqual(["run", "-d", "-it"]);
  expect(run.slice(-2)).toEqual(["orca:latest", "bash"]);
  expect(t.attached[0]).toEqual(["exec", "-it", "orca-app", "claude", "--resume", "abc"]);
});

test("a command in a stopped container starts it in the background first", async () => {
  const t = fakeContext();
  const dir = folder(t.home);
  await start(t.ctx, dir, {});
  t.state.containers.push({ name: "orca-app", workspace: dir, home: join(t.ctx.orcaDir, "projects/app/home") });
  await start(t.ctx, dir, { command: ["claude"] });
  expect(t.calls).toContainEqual(["start", "orca-app"]);
  expect(t.attached[1]).toEqual(["exec", "-it", "orca-app", "claude"]);
});

test("a command in a running container just runs", async () => {
  const t = fakeContext();
  const dir = folder(t.home);
  await start(t.ctx, dir, {});
  t.state.containers.push({ name: "orca-app", running: true, workspace: dir, home: join(t.ctx.orcaDir, "projects/app/home") });
  await start(t.ctx, dir, { command: ["claude"] });
  expect(t.calls.some((c) => c[0] === "start")).toBe(false);
  expect(t.attached[1]).toEqual(["exec", "-it", "orca-app", "claude"]);
});

test("a project made by orca new starts under its own name, not 'workspace'", async () => {
  const t = fakeContext();
  const record = join(t.ctx.orcaDir, "projects/web");
  mkdirSync(join(record, "workspace"), { recursive: true });
  writeFileSync(join(record, "project-path"), join(record, "workspace") + "\n");
  await start(t.ctx, join(record, "workspace"), {});
  expect(t.attached[0]).toContain("orca-web");
});
