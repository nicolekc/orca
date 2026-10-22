import { expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadProjects } from "../projects";
import { fakeContext } from "./fake";

function record(orcaDir: string, name: string, folder: string) {
  const dir = join(orcaDir, "projects", name);
  mkdirSync(join(dir, "home"), { recursive: true });
  writeFileSync(join(dir, "project-path"), folder + "\n");
  return dir;
}

test("no records and no containers: no projects", async () => {
  const { ctx } = fakeContext();
  expect(await loadProjects(ctx)).toEqual([]);
});

test("a record with its container, matched by the home it mounts", async () => {
  const t = fakeContext();
  const dir = record(t.ctx.orcaDir, "app", "/Users/me/dev/app");
  // Named differently on purpose: matching doesn't rely on container names
  t.state.containers.push({ name: "something-else", running: true, workspace: "/Users/me/dev/app", home: join(dir, "home") });
  const [p] = await loadProjects(t.ctx);
  expect(p.name).toBe("app");
  expect(p.folder).toBe("/Users/me/dev/app");
  expect(p.container?.name).toBe("something-else");
  expect(p.container?.running).toBe(true);
  expect(p.legacy).toBeNull();
});

test("a record without a container", async () => {
  const { ctx, home } = fakeContext();
  record(ctx.orcaDir, "app", join(home, "dev/app"));
  const [p] = await loadProjects(ctx);
  expect(p.container).toBeNull();
  expect(p.managed).toBe(false);
});

test("a project whose code lives in its record is managed", async () => {
  const { ctx } = fakeContext();
  record(ctx.orcaDir, "web", join(ctx.orcaDir, "projects/web/workspace"));
  const [p] = await loadProjects(ctx);
  expect(p.managed).toBe(true);
});

test("a pre-migration container with no record shows up as not migrated", async () => {
  const { ctx } = fakeContext({
    containers: [{ name: "ralph-old", workspace: "/Users/me/dev/old" }],
  });
  const [p] = await loadProjects(ctx);
  expect(p.name).toBe("old");
  expect(p.folder).toBe("/Users/me/dev/old");
  expect(p.container).toBeNull();
  expect(p.legacy?.name).toBe("ralph-old");
});

test("a migrated project's old container is a backup: one project, not reported as needing migration", async () => {
  const t = fakeContext();
  const dir = record(t.ctx.orcaDir, "app", "/Users/me/dev/app");
  t.state.containers.push(
    { name: "ralph-app", workspace: "/Users/me/dev/app" },
    { name: "orca-app", workspace: "/Users/me/dev/app", home: join(dir, "home") },
  );
  const projects = await loadProjects(t.ctx);
  expect(projects).toHaveLength(1);
  expect(projects[0].container?.name).toBe("orca-app");
  expect(projects[0].legacy).toBeNull();
});

test("a project migrated but not started yet isn't reported as needing migration", async () => {
  const t = fakeContext();
  const dir = record(t.ctx.orcaDir, "app", "/Users/me/dev/app");
  writeFileSync(join(dir, "home/.bashrc"), "");
  t.state.containers.push({ name: "ralph-app", workspace: "/Users/me/dev/app" });
  const projects = await loadProjects(t.ctx);
  expect(projects).toHaveLength(1);
  expect(projects[0].legacy).toBeNull();
});

test("Docker Desktop's /host_mnt prefix doesn't hide a project's container", async () => {
  const t = fakeContext();
  const dir = record(t.ctx.orcaDir, "app", "/Users/me/dev/app");
  t.state.containers.push({ name: "orca-app", running: true, workspace: "/host_mnt/Users/me/dev/app", home: "/host_mnt" + join(dir, "home") });
  const [p] = await loadProjects(t.ctx);
  expect(p.container?.name).toBe("orca-app");
  expect(p.folder).toBe("/Users/me/dev/app");
});

test("a container is out of date when orca:latest is a different image", async () => {
  const t = fakeContext({ latest: "sha256:new" });
  const dir = record(t.ctx.orcaDir, "app", "/Users/me/dev/app");
  t.state.containers.push({ name: "orca-app", image: "sha256:old", home: join(dir, "home") });
  const [p] = await loadProjects(t.ctx);
  expect(p.outdated).toBe(true);
});

test("projects are ordered by when their container last started, newest first", async () => {
  const t = fakeContext();
  for (const n of ["a", "b", "c"]) record(t.ctx.orcaDir, n, `/Users/me/dev/${n}`);
  const home = (n: string) => join(t.ctx.orcaDir, "projects", n, "home");
  t.state.containers.push(
    { name: "orca-a", startedAt: "2026-10-01T00:00:00Z", home: home("a") },
    { name: "orca-c", startedAt: "2026-10-20T00:00:00Z", home: home("c") },
  );
  expect((await loadProjects(t.ctx)).map((p) => p.name)).toEqual(["c", "a", "b"]);
});

test("docker not running is reported with how to fix it", async () => {
  const t = fakeContext();
  t.ctx.docker = {
    run: async () => ({ code: 1, stdout: "", stderr: "Cannot connect to the Docker daemon" }),
    attach: async () => 1,
  };
  await expect(loadProjects(t.ctx)).rejects.toMatchObject({ message: expect.stringContaining("Docker isn't running") });
});

test("several pre-migration containers on one folder are one project, the most recently used", async () => {
  const { ctx } = fakeContext({
    containers: [
      { name: "ralph-old", workspace: "/Users/me/dev/old", startedAt: "2026-01-01T00:00:00Z" },
      { name: "old-copy", workspace: "/Users/me/dev/old", startedAt: "2026-06-01T00:00:00Z" },
    ],
  });
  const projects = await loadProjects(ctx);
  expect(projects.map((p) => [p.name, p.legacy?.name])).toEqual([["old", "old-copy"]]);
});

test("a pre-migration container on another folder of the same name gets its container's name", async () => {
  const t = fakeContext();
  record(t.ctx.orcaDir, "gepa", "/Users/me/dev/gepa");
  t.state.containers.push({ name: "ralph-gepa", workspace: "/Users/me/old/gepa" });
  const names = (await loadProjects(t.ctx)).map((p) => p.name).sort();
  expect(names).toEqual(["gepa", "ralph-gepa"]);
});

test("a record whose folder ends in a slash still finds its pre-migration container", async () => {
  const t = fakeContext();
  record(t.ctx.orcaDir, "app", "/Users/me/dev/app/");
  t.state.containers.push({ name: "ralph-app", workspace: "/Users/me/dev/app" });
  const projects = await loadProjects(t.ctx);
  expect(projects).toHaveLength(1);
  expect(projects[0].legacy?.name).toBe("ralph-app");
});
