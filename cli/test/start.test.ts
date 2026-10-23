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

const T = { "orca.terminals": "1" };
const homeOf = (t: ReturnType<typeof fakeContext>, name = "app") => join(t.ctx.orcaDir, "projects", name, "home");
const term = (name: string, command = "bash", title = "abc123") => `${name}|0|1792722000|${command}|abc123|${title}`;

test("a new folder gets a record, and a container in the background with its folder and home", async () => {
  const t = fakeContext();
  const dir = folder(t.home);
  await start(t.ctx, dir, {});
  const record = join(t.ctx.orcaDir, "projects/app");
  expect(readFileSync(join(record, "project-path"), "utf8").trim()).toBe(dir);
  expect(existsSync(join(record, "home"))).toBe(true);
  const run = t.calls.find((c) => c[0] === "run")!;
  expect(run.slice(0, 4)).toEqual(["run", "-d", "--name", "orca-app"]);
  expect(run).toContain("orca.project=app");
  expect(run).toContain(`${dir}:/workspace`);
  // node_modules is the project folder's own, like everything else in it
  expect(run.some((a) => a.includes("node_modules"))).toBe(false);
  expect(run).toContain(`${join(record, "home")}:/home/node`);
  expect(run).toContain("ORCA_PROJECT=app");
  // The image's own main process keeps it running while terminals are open
  expect(run[run.length - 1]).toBe("orca:latest");
  expect(t.attached[0]).toEqual(["exec", "-it", "-e", "TERM", "-e", "COLORTERM", "orca-app", "tmux", "new-session", "-A", "-s", "1"]);
});

test("a new home gets the Mac's git identity, and says so", async () => {
  const t = fakeContext({}, [], { "git config --global user.name": "Ada", "git config --global user.email": "ada@example.com" });
  await start(t.ctx, folder(t.home), {});
  expect(readFileSync(join(homeOf(t), ".gitconfig"), "utf8")).toContain("email = ada@example.com");
  expect(t.output()).toContain("Git identity: Ada <ada@example.com>, copied from this Mac");
});

test("--without git-identity leaves it out, and says so", async () => {
  const t = fakeContext({}, [], { "git config --global user.name": "Ada", "git config --global user.email": "ada@example.com" });
  await start(t.ctx, folder(t.home), { without: ["git-identity"] });
  expect(existsSync(join(homeOf(t), ".gitconfig"))).toBe(false);
  expect(t.output()).toContain("Git identity: left out");
});

test("an unknown feature for --without is refused", async () => {
  const t = fakeContext();
  await expect(start(t.ctx, folder(t.home), { without: ["gh-auth"] })).rejects.toMatchObject({ message: expect.stringContaining("gh-auth") });
});

test("a home that already has files is never given the creation features", async () => {
  const t = fakeContext({}, [], { "git config --global user.name": "Ada", "git config --global user.email": "ada@example.com" });
  const dir = folder(t.home);
  mkdirSync(homeOf(t), { recursive: true });
  writeFileSync(join(homeOf(t), ".bashrc"), "");
  writeFileSync(join(t.ctx.orcaDir, "projects/app/project-path"), dir + "\n");
  await start(t.ctx, dir, {});
  expect(existsSync(join(homeOf(t), ".gitconfig"))).toBe(false);
  expect(t.output()).not.toContain("Git identity");
});

test("a Mac without a git identity says how to set one", async () => {
  const t = fakeContext();
  await start(t.ctx, folder(t.home), {});
  expect(t.output()).toContain("none on this Mac");
});

test("a stopped container is started in the background, then opens a terminal", async () => {
  const t = fakeContext();
  const dir = folder(t.home);
  t.state.containers.push({ name: "orca-app", labels: T, workspace: dir, home: homeOf(t) });
  await start(t.ctx, dir, {});
  expect(t.calls).toContainEqual(["start", "orca-app"]);
  expect(t.attached[0].slice(-3)).toEqual(["-A", "-s", "1"]);
});

test("with terminals open, it asks which to attach to", async () => {
  const t = fakeContext({}, ["2"]);
  const dir = folder(t.home);
  t.state.containers.push({ name: "orca-app", running: true, labels: T, workspace: dir, home: homeOf(t), terminals: [term("1", "claude", "Fix login"), term("2")] });
  await start(t.ctx, dir, {});
  expect(t.output()).toContain("2 terminals open");
  expect(t.output()).toContain('"Fix login"');
  expect(t.attached[0].slice(-3)).toEqual(["-A", "-s", "2"]);
});

test("answering with Enter opens a new terminal under the next free name", async () => {
  const t = fakeContext({}, [""]);
  const dir = folder(t.home);
  t.state.containers.push({ name: "orca-app", running: true, labels: T, workspace: dir, home: homeOf(t), terminals: [term("1"), term("3")] });
  await start(t.ctx, dir, {});
  expect(t.attached[0].slice(-1)).toEqual(["2"]);
});

test("--new and --terminal skip the question", async () => {
  const t = fakeContext({}, ["1"]);
  const dir = folder(t.home);
  t.state.containers.push({ name: "orca-app", running: true, labels: T, workspace: dir, home: homeOf(t), terminals: [term("1")] });
  await start(t.ctx, dir, { new: true });
  await start(t.ctx, dir, { terminal: "1" });
  expect(t.attached.map((a) => a[a.length - 1])).toEqual(["2", "1"]);
});

test("a command runs in a new terminal", async () => {
  const t = fakeContext();
  const dir = folder(t.home);
  t.state.containers.push({ name: "orca-app", running: true, labels: T, workspace: dir, home: homeOf(t), terminals: [term("1")] });
  await start(t.ctx, dir, { command: ["claude", "--resume", "abc"] });
  expect(t.attached[0].slice(-7)).toEqual(["new-session", "-s", "2", "--", "claude", "--resume", "abc"]);
});

test("a container from before terminals opens plain shells, and says how to get terminals", async () => {
  const t = fakeContext();
  const dir = folder(t.home);
  t.state.containers.push({ name: "orca-app", running: true, workspace: dir, home: homeOf(t) });
  await start(t.ctx, dir, {});
  expect(t.attached[0]).toEqual(["exec", "-it", "orca-app", "bash"]);
  expect(t.output()).toContain("orca start --fresh");
  t.state.containers[0].running = false;
  await start(t.ctx, dir, {});
  expect(t.attached[1]).toEqual(["start", "-ai", "orca-app"]);
});

test("an image from before terminals makes a container whose shell is its main process", async () => {
  const t = fakeContext({ noTerminals: ["sha256:new"] });
  await start(t.ctx, folder(t.home), {});
  expect(t.attached[0].slice(0, 2)).toEqual(["run", "-it"]);
  expect(t.attached[0].slice(-2)).toEqual(["orca:latest", "bash"]);
  expect(t.output()).toContain("orca update");
});

test("an out-of-date container says what recreating keeps and loses, then opens a terminal", async () => {
  const t = fakeContext({ latest: "sha256:new", created: { "sha256:old": "2026-09-02T09:15:00Z", "sha256:new": "2026-10-21T18:30:00Z" } });
  const dir = folder(t.home);
  t.state.containers.push({ name: "orca-app", image: "sha256:old", labels: T, workspace: dir, home: homeOf(t) });
  await start(t.ctx, dir, {});
  const out = t.output();
  expect(out).toContain("Image update available");
  expect(out).toContain("2026-09-02");
  expect(out).toContain("orca stop app, then orca start --fresh");
  expect(out).toMatch(/Kept:.*~/);
  expect(out).toContain("Reset:");
  expect(t.attached[0]).toContain("tmux");
});

test("the update notice leaves out build dates that can't tell the images apart", async () => {
  const t = fakeContext({ latest: "sha256:new", created: { "sha256:old": "2026-10-21T22:08:00Z", "sha256:new": "2026-10-21T22:08:30Z" } });
  const dir = folder(t.home);
  t.state.containers.push({ name: "orca-app", image: "sha256:old", labels: T, workspace: dir, home: homeOf(t) });
  await start(t.ctx, dir, {});
  expect(t.output()).toContain("made from an older orca image");
  expect(t.output()).not.toContain("22:08");
});

test("--fresh recreates a stopped container", async () => {
  const t = fakeContext();
  const dir = folder(t.home);
  t.state.containers.push({ name: "orca-app", labels: T, workspace: dir, home: homeOf(t) });
  await start(t.ctx, dir, { fresh: true });
  expect(t.calls).toContainEqual(["rm", "orca-app"]);
  expect(t.calls.filter((c) => c[0] === "run")).toHaveLength(1);
  expect(t.output()).not.toContain("install dependencies again");
});

test("--fresh on a container from before node_modules moved removes its old volume", async () => {
  const t = fakeContext({ volumes: ["orca-app_node_modules"] });
  const dir = folder(t.home);
  t.state.containers.push({ name: "orca-app", workspace: dir, home: join(t.ctx.orcaDir, "projects/app/home") });
  await start(t.ctx, dir, { fresh: true });
  expect(t.state.volumes).toHaveLength(0);
  expect(t.output()).toContain("install dependencies again");
});

test("--fresh refuses while the container is running, saying what stopping it ends", async () => {
  const t = fakeContext();
  const dir = folder(t.home);
  t.state.containers.push({ name: "orca-app", running: true, labels: T, workspace: dir, home: homeOf(t), terminals: [term("1"), term("2")] });
  const err = await start(t.ctx, dir, { fresh: true }).catch((e) => e);
  expect(err.message).toContain("2 terminals open");
  expect(err.fix).toContain("orca stop app");
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

test("a project made by orca new starts under its own name, not 'workspace'", async () => {
  const t = fakeContext();
  const record = join(t.ctx.orcaDir, "projects/web");
  mkdirSync(join(record, "workspace"), { recursive: true });
  writeFileSync(join(record, "project-path"), join(record, "workspace") + "\n");
  await start(t.ctx, join(record, "workspace"), {});
  expect(t.calls.find((c) => c[0] === "run")).toContain("orca-web");
});
