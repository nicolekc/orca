import { expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { del } from "../commands/delete";
import { list } from "../commands/list";
import { create } from "../commands/new";
import { update } from "../commands/update";
import { fakeContext } from "./fake";

function record(orcaDir: string, name: string, folder: string) {
  const dir = join(orcaDir, "projects", name);
  mkdirSync(join(dir, "home"), { recursive: true });
  writeFileSync(join(dir, "project-path"), folder + "\n");
  return dir;
}

// ── new ─────────────────────────────────────────────────────────────────────────────────

test("new makes a project whose code lives in its record, then starts it", async () => {
  const t = fakeContext();
  await create(t.ctx, "web");
  const ws = join(t.ctx.orcaDir, "projects/web/workspace");
  expect(existsSync(ws)).toBe(true);
  expect(readFileSync(join(t.ctx.orcaDir, "projects/web/project-path"), "utf8").trim()).toBe(ws);
  expect(t.attached[0]).toContain("orca-web");
  expect(t.attached[0]).toContain(`${ws}:/workspace`);
});

test("new refuses a name that's taken", async () => {
  const t = fakeContext();
  record(t.ctx.orcaDir, "web", "/Users/me/dev/web");
  await expect(create(t.ctx, "web")).rejects.toMatchObject({ message: expect.stringContaining("already") });
});

test("new refuses a name Docker can't use", async () => {
  const t = fakeContext();
  await expect(create(t.ctx, "my app")).rejects.toMatchObject({ message: expect.stringContaining("my app") });
  expect(existsSync(join(t.ctx.orcaDir, "projects/my app"))).toBe(false);
});

// ── delete ──────────────────────────────────────────────────────────────────────────────

function withContainer(answers: string[] = ["app"]) {
  const t = fakeContext({ volumes: ["orca-app_node_modules"] }, answers);
  const dir = record(t.ctx.orcaDir, "app", "/Users/me/dev/app");
  t.state.containers.push({ name: "orca-app", workspace: "/Users/me/dev/app", home: join(dir, "home") });
  return { ...t, dir };
}

test("delete removes the container and its node_modules, keeps the home, after typing the name", async () => {
  const t = withContainer();
  await del(t.ctx, "app", {});
  expect(t.state.containers).toHaveLength(0);
  expect(t.state.volumes).toHaveLength(0);
  expect(existsSync(join(t.dir, "home"))).toBe(true);
  const out = t.output();
  expect(out).toContain("orca-app");
  expect(out).toContain("orca-app_node_modules");
  expect(out).toMatch(/Kept:.*home/);
  expect(out).toContain("/Users/me/dev/app");
});

test("delete --home also removes the home and the record", async () => {
  const t = withContainer();
  await del(t.ctx, "app", { home: true });
  expect(existsSync(t.dir)).toBe(false);
});

test("delete never removes the code of a project made by orca new", async () => {
  const t = fakeContext({}, ["web"]);
  const dir = record(t.ctx.orcaDir, "web", join(t.ctx.orcaDir, "projects/web/workspace"));
  mkdirSync(join(dir, "workspace"));
  writeFileSync(join(dir, "workspace/index.ts"), "code");
  await del(t.ctx, "web", { home: true });
  expect(existsSync(join(dir, "workspace/index.ts"))).toBe(true);
  expect(existsSync(join(dir, "home"))).toBe(false);
  expect(t.output()).toContain("workspace");
});

test("delete does nothing when the typed name doesn't match", async () => {
  const t = withContainer(["nope"]);
  await del(t.ctx, "app", {});
  expect(t.state.containers).toHaveLength(1);
  expect(t.output()).toContain("Nothing deleted");
});

test("delete without a terminal needs --yes", async () => {
  const t = withContainer([]);
  const err = await del(t.ctx, "app", {}).catch((e) => e);
  expect(err.fix).toContain("--yes");
  expect(t.state.containers).toHaveLength(1);
  await del(t.ctx, "app", { yes: true });
  expect(t.state.containers).toHaveLength(0);
});

test("delete refuses while the container is running", async () => {
  const t = withContainer();
  t.state.containers[0].running = true;
  await expect(del(t.ctx, "app", {})).rejects.toMatchObject({ message: expect.stringContaining("running") });
});

test("delete of an unknown project lists the real ones", async () => {
  const t = withContainer();
  const err = await del(t.ctx, "nope", {}).catch((e) => e);
  expect(err.message).toContain("nope");
  expect(err.fix).toContain("app");
});

test("delete leaves pre-migration containers to the migration", async () => {
  const t = fakeContext({ containers: [{ name: "ralph-old", workspace: "/Users/me/dev/old" }] }, ["old"]);
  const err = await del(t.ctx, "old", {}).catch((e) => e);
  expect(err.fix).toContain("orca-migrate.sh");
  expect(t.state.containers).toHaveLength(1);
});

// ── update ──────────────────────────────────────────────────────────────────────────────

test("update pulls the published image and names it orca:latest", async () => {
  const t = fakeContext({ latest: "sha256:old", pulled: "sha256:new" });
  await update(t.ctx, { self: false });
  // In the terminal, to show its progress
  expect(t.attached).toContainEqual(["pull", "ghcr.io/nicolekc/orca:latest"]);
  expect(t.calls).toContainEqual(["tag", "ghcr.io/nicolekc/orca:latest", "orca:latest"]);
  expect(t.output()).toContain("updated");
});

test("update says when the image was already current", async () => {
  const t = fakeContext({ latest: "sha256:new", pulled: "sha256:new" });
  await update(t.ctx, { self: false });
  expect(t.output()).toContain("up to date");
});

test("update failing to pull says how to log in", async () => {
  const t = fakeContext({ failPull: true });
  const err = await update(t.ctx, { self: false }).catch((e) => e);
  expect(err.fix).toContain("docker login ghcr.io");
});

function selfUpdate(t: ReturnType<typeof fakeContext>, files: Record<string, string>, version = "aaa") {
  const execPath = join(t.home, "orca");
  writeFileSync(execPath, "old binary");
  const fetch = (async (url: string) => {
    const name = String(url).split("/").pop()!;
    return name in files ? new Response(files[name]) : new Response("", { status: 404 });
  }) as unknown as typeof globalThis.fetch;
  return { execPath, opts: { version, execPath, fetch, platform: "darwin", arch: "arm64" } };
}

const sha = (s: string) => new Bun.CryptoHasher("sha256").update(s).digest("hex");

test("update replaces orca with the published build after checking its checksum", async () => {
  const t = fakeContext();
  const s = selfUpdate(t, { version: "bbb\n", "orca-darwin-arm64": "new binary", "orca-darwin-arm64.sha256": `${sha("new binary")}  orca-darwin-arm64\n` });
  await update(t.ctx, { self: s.opts });
  expect(readFileSync(s.execPath, "utf8")).toBe("new binary");
  expect(t.output()).toContain("aaa → bbb");
});

test("update refuses a build whose checksum doesn't match", async () => {
  const t = fakeContext();
  const s = selfUpdate(t, { version: "bbb", "orca-darwin-arm64": "tampered", "orca-darwin-arm64.sha256": sha("new binary") });
  await expect(update(t.ctx, { self: s.opts })).rejects.toMatchObject({ message: expect.stringContaining("checksum") });
  expect(readFileSync(s.execPath, "utf8")).toBe("old binary");
});

test("update leaves orca alone when it's current, or running from source", async () => {
  const t = fakeContext();
  const s = selfUpdate(t, { version: "aaa" });
  await update(t.ctx, { self: s.opts });
  await update(t.ctx, { self: { ...s.opts, version: "dev" } });
  expect(readFileSync(s.execPath, "utf8")).toBe("old binary");
  expect(t.output()).toContain("orca: up to date");
  expect(t.output()).toContain("from source");
});

// ── list ────────────────────────────────────────────────────────────────────────────────

test("list with no projects says how to make one", async () => {
  const t = fakeContext();
  await list(t.ctx, {});
  expect(t.output()).toContain("orca new");
});

test("list shows each project's state and folder", async () => {
  const t = fakeContext({ latest: "sha256:new" });
  const dir = record(t.ctx.orcaDir, "app", join(t.home, "dev/app"));
  record(t.ctx.orcaDir, "idle", join(t.home, "dev/idle"));
  t.state.containers.push(
    { name: "orca-app", running: true, startedAt: "2026-10-21T00:00:00Z", home: join(dir, "home") },
    { name: "ralph-old", workspace: "/Users/me/dev/old" },
  );
  await list(t.ctx, {});
  const out = t.output();
  expect(out).toMatch(/app\s+● running\s+~\/dev\/app/);
  expect(out).toMatch(/idle\s+– no container\s+~\/dev\/idle/);
  expect(out).toMatch(/old\s+! not migrated/);
});

test("list --json gives scripts the same facts", async () => {
  const t = fakeContext();
  record(t.ctx.orcaDir, "app", "/Users/me/dev/app");
  await list(t.ctx, { json: true });
  const [p] = JSON.parse(t.output());
  expect(p).toMatchObject({ name: "app", folder: "/Users/me/dev/app", state: "no container", imageUpdate: false });
});
