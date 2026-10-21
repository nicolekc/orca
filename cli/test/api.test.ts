import { expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createApi } from "../server/api";
import { fakeContext } from "./fake";

const SESSION = "11111111-2222-3333-4444-555555555555";

function setup(state = {}) {
  const t = fakeContext(state);
  const folder = join(t.home, "dev/app");
  mkdirSync(folder, { recursive: true });
  const record = join(t.ctx.orcaDir, "projects/app");
  mkdirSync(join(record, "home/.claude/projects/-workspace"), { recursive: true });
  writeFileSync(join(record, "project-path"), folder + "\n");
  const s = join(record, `home/.claude/projects/-workspace/${SESSION}.jsonl`);
  writeFileSync(s, JSON.stringify({ type: "ai-title", aiTitle: "Fix login" }) + "\n");
  utimesSync(s, 2000, 2000);
  // A terminal app, as on any system without the macOS default
  writeFileSync(join(t.ctx.orcaDir, "config.json"), JSON.stringify({ terminal: ["term", "{command}"] }));
  const api = createApi(t.ctx, { orca: "/usr/local/bin/orca", version: "abc1234" });
  const call = async (method: string, path: string, body?: unknown) => {
    const res = await api(new Request(`http://127.0.0.1:7321${path}`, { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { "content-type": "application/json" } }));
    return { status: res!.status, body: await res!.json() };
  };
  return { ...t, folder, record, call };
}

test("projects list each project's state, folder, forwards and update flag", async () => {
  const t = setup({ latest: "sha256:new" });
  t.state.containers.push({ name: "orca-app", running: true, image: "sha256:old", home: join(t.record, "home") });
  writeFileSync(join(t.record, "forwards"), "3000\n");
  const { status, body } = await t.call("GET", "/api/projects");
  expect(status).toBe(200);
  expect(body).toEqual([
    expect.objectContaining({ name: "app", folder: "~/dev/app", state: "running", imageUpdate: true, forwards: [{ port: 3000, url: "http://3000.app.localhost:7320" }] }),
  ]);
});

test("a project's detail adds its sessions and image dates", async () => {
  const t = setup({ latest: "sha256:new", created: { "sha256:new": "2026-10-21T18:30:00Z", "sha256:old": "2026-09-01T00:00:00Z" } });
  t.state.containers.push({ name: "orca-app", image: "sha256:old", home: join(t.record, "home") });
  const { body } = await t.call("GET", "/api/projects/app");
  expect(body.sessions).toEqual([{ project: "app", id: SESSION, title: "Fix login", updated: 2000000 }]);
  expect(body.image).toEqual({ container: "2026-09-01T00:00:00Z", newest: "2026-10-21T18:30:00Z" });
});

test("an unknown project is a 404 with the real names", async () => {
  const t = setup();
  const { status, body } = await t.call("GET", "/api/projects/nope");
  expect(status).toBe(404);
  expect(body.fix).toContain("app");
});

test("sessions from every project, newest first", async () => {
  const t = setup();
  const { body } = await t.call("GET", "/api/sessions");
  expect(body).toEqual([{ project: "app", id: SESSION, title: "Fix login", updated: 2000000 }]);
});

test("open starts the project in a new terminal", async () => {
  const t = setup();
  const { status } = await t.call("POST", "/api/projects/app/open", {});
  expect(status).toBe(200);
  expect(t.launched[0].join(" ")).toContain(`/usr/local/bin/orca start ${t.folder}`);
});

test("open with a session resumes it with claude", async () => {
  const t = setup();
  await t.call("POST", "/api/projects/app/open", { session: SESSION });
  expect(t.launched[0].join(" ")).toContain(`start ${t.folder} -- claude --resume ${SESSION}`);
});

test("open refuses a session that isn't the project's", async () => {
  const t = setup();
  for (const session of ["99999999-2222-3333-4444-555555555555", "x; rm -rf ~"]) {
    const { status } = await t.call("POST", "/api/projects/app/open", { session });
    expect(status).toBe(400);
  }
  expect(t.launched).toHaveLength(0);
});

test("open refuses a project that still needs migrating, saying how", async () => {
  const t = setup();
  t.state.containers.push({ name: "ralph-old", workspace: "/Users/me/dev/old" });
  const { status, body } = await t.call("POST", "/api/projects/old/open", {});
  expect(status).toBe(400);
  expect(body.fix).toContain("orca-migrate.sh");
});

test("new makes the record and opens it in a terminal", async () => {
  const t = setup();
  const { status } = await t.call("POST", "/api/projects", { name: "web" });
  expect(status).toBe(200);
  const ws = join(t.ctx.orcaDir, "projects/web/workspace");
  expect(existsSync(ws)).toBe(true);
  expect(t.launched[0].join(" ")).toContain(`start ${ws}`);
});

test("new refuses a bad name without making anything", async () => {
  const t = setup();
  const { status, body } = await t.call("POST", "/api/projects", { name: "../evil" });
  expect(status).toBe(400);
  expect(body.error).toContain("project name");
  expect(t.launched).toHaveLength(0);
});

test("recreate opens orca start --fresh, but not while the container runs", async () => {
  const t = setup();
  t.state.containers.push({ name: "orca-app", running: true, home: join(t.record, "home") });
  expect((await t.call("POST", "/api/projects/app/recreate", {})).status).toBe(400);
  t.state.containers[0].running = false;
  expect((await t.call("POST", "/api/projects/app/recreate", {})).status).toBe(200);
  expect(t.launched[0].join(" ")).toContain(`start --fresh ${t.folder}`);
});

test("forwards are added and removed", async () => {
  const t = setup();
  expect((await t.call("POST", "/api/projects/app/forwards", { port: 3000 })).status).toBe(200);
  expect(readFileSync(join(t.record, "forwards"), "utf8").trim()).toBe("3000");
  expect((await t.call("POST", "/api/projects/app/forwards", { port: "3000; x" })).status).toBe(400);
  expect((await t.call("DELETE", "/api/projects/app/forwards/3000", {})).status).toBe(200);
  expect(readFileSync(join(t.record, "forwards"), "utf8").trim()).toBe("");
});

test("delete needs the project's name typed, and passes --home through", async () => {
  const t = setup();
  t.state.containers.push({ name: "orca-app", home: join(t.record, "home") });
  expect((await t.call("POST", "/api/projects/app/delete", { confirm: "nope" })).status).toBe(400);
  expect(t.state.containers).toHaveLength(1);
  const { status, body } = await t.call("POST", "/api/projects/app/delete", { confirm: "app", home: true });
  expect(status).toBe(200);
  expect(body.messages.join("\n")).toContain("Deleted");
  expect(existsSync(t.record)).toBe(false);
});

test("info gives the version and the proxy's state", async () => {
  const t = setup();
  const { body } = await t.call("GET", "/api/info");
  expect(body).toEqual({ version: "abc1234", proxy: { port: 7320, running: false } });
});
