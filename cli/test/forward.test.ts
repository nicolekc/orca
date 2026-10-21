import { expect, test } from "bun:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { del } from "../commands/delete";
import { forward } from "../commands/forward";
import { start } from "../commands/start";
import { list } from "../commands/list";
import { hostFor, PROXY, PROXY_IMAGE, projectAt } from "../proxy";
import { fakeContext } from "./fake";

function project(t: ReturnType<typeof fakeContext>, name = "app") {
  const folder = join(t.home, "dev", name);
  mkdirSync(folder, { recursive: true });
  const dir = join(t.ctx.orcaDir, "projects", name);
  mkdirSync(join(dir, "home"), { recursive: true });
  writeFileSync(join(dir, "project-path"), folder + "\n");
  return { folder, dir };
}

const caddyfile = (t: ReturnType<typeof fakeContext>) => readFileSync(join(t.ctx.orcaDir, "proxy/Caddyfile"), "utf8");
const proxy = (t: ReturnType<typeof fakeContext>) => t.state.containers.find((c) => c.name === PROXY);
const runOf = (t: ReturnType<typeof fakeContext>) => t.calls.find((c) => c[0] === "run" && c[1] === "-d")!;

test("forwarding a port records it, starts the proxy on 127.0.0.1:7320 and prints the address", async () => {
  const t = fakeContext();
  const { dir } = project(t);
  await forward(t.ctx, { project: "app", add: 3000 });
  expect(readFileSync(join(dir, "forwards"), "utf8").trim()).toBe("3000");
  const run = runOf(t);
  expect(run).toContain("127.0.0.1:7320:80");
  expect(run).toContain(`${join(t.ctx.orcaDir, "proxy")}:/etc/caddy:ro`);
  expect(run).toContain(PROXY_IMAGE);
  expect(proxy(t)?.running).toBe(true);
  expect(caddyfile(t)).toContain("host 3000.app.localhost");
  expect(caddyfile(t)).toContain("reverse_proxy orca-app:3000");
  expect(t.output()).toContain("http://3000.app.localhost:7320");
});

test("the proxy's port comes from ~/.orca/config.json", async () => {
  const t = fakeContext();
  project(t);
  mkdirSync(t.ctx.orcaDir, { recursive: true });
  writeFileSync(join(t.ctx.orcaDir, "config.json"), JSON.stringify({ proxyPort: 8100 }));
  await forward(t.ctx, { project: "app", add: 3000 });
  expect(runOf(t)).toContain("127.0.0.1:8100:80");
  expect(t.output()).toContain("http://3000.app.localhost:8100");
});

test("a proxy on an old port is recreated on the configured one", async () => {
  const t = fakeContext();
  project(t);
  t.state.containers.push({ name: PROXY, running: true, labels: { "orca.port": "7320" } });
  mkdirSync(t.ctx.orcaDir, { recursive: true });
  writeFileSync(join(t.ctx.orcaDir, "config.json"), JSON.stringify({ proxyPort: 8100 }));
  await forward(t.ctx, { project: "app", add: 3000 });
  expect(t.calls).toContainEqual(["rm", "-f", PROXY]);
  expect(runOf(t)).toContain("127.0.0.1:8100:80");
});

test("a running proxy is reloaded, not recreated", async () => {
  const t = fakeContext();
  project(t);
  await forward(t.ctx, { project: "app", add: 3000 });
  await forward(t.ctx, { project: "app", add: 4000 });
  expect(t.calls.filter((c) => c[0] === "run")).toHaveLength(1);
  expect(t.calls.some((c) => c[0] === "exec" && c.includes("reload"))).toBe(true);
  expect(caddyfile(t)).toContain("host 4000.app.localhost");
});

test("the proxy joins every project network and refuses requests from them", async () => {
  const t = fakeContext({ networks: [{ name: "orca-net-app", subnet: "172.30.0.0/16", labels: { "orca.network": "app" } }] });
  project(t);
  await forward(t.ctx, { project: "app", add: 3000 });
  expect(proxy(t)?.networks).toContain("orca-net-app");
  expect(caddyfile(t)).toContain("remote_ip 172.30.0.0/16");
});

test("removing the last forward stops the proxy", async () => {
  const t = fakeContext();
  const { dir } = project(t);
  await forward(t.ctx, { project: "app", add: 3000 });
  await forward(t.ctx, { project: "app", remove: 3000 });
  expect(readFileSync(join(dir, "forwards"), "utf8").trim()).toBe("");
  expect(proxy(t)).toBeUndefined();
  expect(t.output()).toContain("no forwards left");
});

test("forward with no port lists the project's forwards", async () => {
  const t = fakeContext();
  project(t);
  await forward(t.ctx, { project: "app", add: 3000 });
  t.lines.length = 0;
  await forward(t.ctx, { project: "app" });
  expect(t.output()).toContain("http://3000.app.localhost:7320 → app:3000");
});

test("a port must be a number from 1 to 65535", async () => {
  const t = fakeContext();
  project(t);
  for (const bad of [0, 70000, 3.5]) await expect(forward(t.ctx, { project: "app", add: bad })).rejects.toMatchObject({ message: expect.stringContaining("port") });
});

test("forwarding for an unknown project lists the real ones", async () => {
  const t = fakeContext();
  project(t);
  const err = await forward(t.ctx, { project: "nope", add: 3000 }).catch((e) => e);
  expect(err.fix).toContain("app");
});

test("addresses are lowercase hostnames", () => {
  expect(hostFor(3000, "My_App")).toBe("3000.my-app.localhost");
});

test("the project is found from any folder inside it", () => {
  const t = fakeContext();
  const { folder } = project(t);
  mkdirSync(join(folder, "src/deep"), { recursive: true });
  expect(projectAt(t.ctx, join(folder, "src/deep"))).toBe("app");
  expect(projectAt(t.ctx, t.home)).toBeNull();
});

// ── start and delete keep networks and the proxy in step ─────────────────────────────────

test("a new container joins its project's own network", async () => {
  const t = fakeContext();
  const { folder } = project(t);
  await start(t.ctx, folder, {});
  expect(t.state.networks.map((n) => n.name)).toContain("orca-net-app");
  expect(t.attached[0]).toContain("--network");
  expect(t.attached[0]).toContain("orca-net-app");
});

test("an older container without a network is connected before it starts", async () => {
  const t = fakeContext();
  const { folder, dir } = project(t);
  t.state.containers.push({ name: "orca-app", workspace: folder, home: join(dir, "home") });
  await start(t.ctx, folder, {});
  expect(t.state.containers.find((c) => c.name === "orca-app")?.networks).toContain("orca-net-app");
});

test("starting a project with forwards brings the proxy back", async () => {
  const t = fakeContext();
  const { folder, dir } = project(t);
  writeFileSync(join(dir, "forwards"), "3000\n");
  await start(t.ctx, folder, {});
  expect(proxy(t)?.running).toBe(true);
  expect(proxy(t)?.networks).toContain("orca-net-app");
});

test("list shows forwards and whether the proxy is running", async () => {
  const t = fakeContext();
  project(t);
  await forward(t.ctx, { project: "app", add: 3000 });
  t.lines.length = 0;
  await list(t.ctx, {});
  expect(t.output()).toMatch(/Forwards .*127\.0\.0\.1:7320.*running/);
  expect(t.output()).toContain("http://3000.app.localhost:7320 → app:3000");
});

test("deleting a project removes its network", async () => {
  const t = fakeContext({ volumes: [] }, ["app"]);
  const { folder } = project(t);
  await start(t.ctx, folder, {});
  t.state.containers.push({ name: "orca-app", workspace: folder, home: join(t.ctx.orcaDir, "projects/app/home"), networks: ["orca-net-app"] });
  await del(t.ctx, "app", {});
  expect(t.state.networks.map((n) => n.name)).not.toContain("orca-net-app");
});
