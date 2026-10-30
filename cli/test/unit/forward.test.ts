import { expect, test } from "bun:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { del } from "../../commands/delete";
import { forward } from "../../commands/forward";
import { start } from "../../commands/start";
import { list } from "../../commands/list";
import { hostFor, PROXY, PROXY_IMAGE, projectAt } from "../../proxy";
import { fakeContext } from "../support/fake";

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
  expect(t.calls.find((c) => c[0] === "run")).toContain("--network");
  expect(t.calls.find((c) => c[0] === "run")).toContain("orca-net-app");
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
  // The container start made, now stopped
  Object.assign(t.state.containers[0], { running: false, workspace: folder, home: join(t.ctx.orcaDir, "projects/app/home"), networks: ["orca-net-app"] });
  await del(t.ctx, "app", {});
  expect(t.state.networks.map((n) => n.name)).not.toContain("orca-net-app");
});

// ── extra addresses (orca forward <port> --url) ─────────────────────────────────────────────

test("a URL is served too: over HTTPS on its own Mac port, with Caddy's certificates kept", async () => {
  const t = fakeContext({}, [], {}, { "dev.myapp.com": ["127.0.0.1"] });
  const { dir } = project(t);
  await forward(t.ctx, { project: "app", add: 3000, url: "https://dev.myapp.com/auth/callback?x=1" });
  expect(readFileSync(join(dir, "forwards"), "utf8")).toBe("3000\n3000 https://dev.myapp.com\n");
  const run = runOf(t);
  expect(run).toContain("127.0.0.1:7320:80");
  expect(run).toContain("127.0.0.1:443:443");
  expect(run).toContain("orca-proxy-data:/data");
  expect(readFileSync(join(t.ctx.orcaDir, "proxy/orca-ca.crt"), "utf8")).toContain("BEGIN CERTIFICATE");
  expect(caddyfile(t)).toContain("https://dev.myapp.com:443 {");
  expect(caddyfile(t)).toContain("local_certs");
  expect(caddyfile(t)).toMatch(/https:\/\/dev\.myapp\.com:443 \{[^}]*host dev\.myapp\.com\s+handle @r0 \{\s+reverse_proxy orca-app:3000/);
  expect(t.output()).toContain("✓ http://3000.app.localhost:7320 → app:3000");
  expect(t.output()).toContain("✓ https://dev.myapp.com → app:3000  (paths go through as they are)");
  expect(t.output()).toContain("certificate authority");
  expect(t.output()).not.toContain("doesn't point at this Mac");
});

test("a hostname that doesn't point at the Mac gets the line that would", async () => {
  const t = fakeContext();
  project(t);
  await forward(t.ctx, { project: "app", add: 3000, url: "http://dev.myapp.test:8080" });
  expect(t.output()).toContain("dev.myapp.test doesn't point at this Mac");
  expect(t.output()).toContain("127.0.0.1 dev.myapp.test");
  expect(caddyfile(t)).toContain("http://:8080 {");
  expect(runOf(t)).toContain("127.0.0.1:8080:8080");
});

test("localhost URLs need no pointing, and a port can have several URLs", async () => {
  const t = fakeContext();
  const { dir } = project(t);
  await forward(t.ctx, { project: "app", add: 3000, url: "http://localhost:3000" });
  await forward(t.ctx, { project: "app", add: 3000, url: "http://localhost:3001" });
  expect(readFileSync(join(dir, "forwards"), "utf8")).toBe("3000\n3000 http://localhost:3000\n3000 http://localhost:3001\n");
  expect(t.output()).not.toContain("doesn't point");
  t.lines.length = 0;
  await forward(t.ctx, { project: "app", add: 3000, url: "http://localhost:3000/" });
  expect(t.output()).toContain("Already forwarded: http://localhost:3000 → app:3000");
  // Its usual address isn't an extra one
  await forward(t.ctx, { project: "app", add: 3000, url: "http://3000.app.localhost:7320" });
  expect(readFileSync(join(dir, "forwards"), "utf8")).toBe("3000\n3000 http://localhost:3000\n3000 http://localhost:3001\n");
});

test("a URL on the proxy's own port is served over HTTP with the usual addresses", async () => {
  const t = fakeContext();
  project(t);
  await forward(t.ctx, { project: "app", add: 3000, url: "http://dev.myapp.test:7320" });
  expect(runOf(t).filter((a) => a.startsWith("127.0.0.1:"))).toEqual(["127.0.0.1:7320:80"]);
  expect(caddyfile(t).match(/^http:\/\/:80 \{/gm)).toHaveLength(1);
  expect(caddyfile(t)).toContain("host dev.myapp.test");
  await expect(forward(t.ctx, { project: "app", add: 3000, url: "https://other.test:7320" })).rejects.toMatchObject({ message: expect.stringContaining("plain HTTP") });
});

test("one Mac port is either HTTP or HTTPS, and a URL goes to one forward", async () => {
  const t = fakeContext();
  project(t);
  project(t, "web");
  await forward(t.ctx, { project: "app", add: 3000, url: "https://dev.myapp.com" });
  await expect(forward(t.ctx, { project: "web", add: 5173, url: "http://other.test:443" })).rejects.toMatchObject({ message: expect.stringContaining("either HTTP or HTTPS") });
  const err = await forward(t.ctx, { project: "web", add: 5173, url: "https://dev.myapp.com" }).catch((e) => e);
  expect(err.message).toContain("already goes to app:3000");
  expect(err.fix).toContain("orca forward --remove https://dev.myapp.com --project app");
  // Another hostname on the same HTTPS port is fine
  await forward(t.ctx, { project: "web", add: 5173, url: "https://web.myapp.com" });
  expect(caddyfile(t)).toContain("https://dev.myapp.com:443, https://web.myapp.com:443 {");
});

test("a URL must be http or https with a host, and not on the dashboard's port", async () => {
  const t = fakeContext();
  project(t);
  for (const bad of ["dev.myapp.com", "ftp://x.test", "https://user:pw@x.test"])
    await expect(forward(t.ctx, { project: "app", add: 3000, url: bad })).rejects.toMatchObject({ fix: expect.stringContaining("https://") });
  await expect(forward(t.ctx, { project: "app", add: 3000, url: "http://x.test:7321" })).rejects.toMatchObject({ message: expect.stringContaining("dashboard") });
});

test("if the Mac port is taken, the URL isn't kept and the other forwards still work", async () => {
  const t = fakeContext({ taken: [443] });
  const { dir } = project(t);
  await forward(t.ctx, { project: "app", add: 3000 });
  const err = await forward(t.ctx, { project: "app", add: 3000, url: "https://dev.myapp.com" }).catch((e) => e);
  expect(err.message).toContain("Port 443 on this Mac is already taken");
  expect(readFileSync(join(dir, "forwards"), "utf8")).toBe("3000\n");
  expect(proxy(t)?.running).toBe(true);
  expect(proxy(t)?.labels?.["orca.ports"]).toBe("");
});

test("removing a URL keeps the port's forward; removing the port removes its URLs", async () => {
  const t = fakeContext();
  const { dir } = project(t);
  await forward(t.ctx, { project: "app", add: 3000, url: "https://dev.myapp.com" });
  await forward(t.ctx, { project: "app", remove: "https://dev.myapp.com/" });
  expect(readFileSync(join(dir, "forwards"), "utf8")).toBe("3000\n");
  expect(t.output()).toContain("Removed https://dev.myapp.com; port 3000 is still forwarded");
  // The proxy no longer needs 443, so it's made again without it
  expect(proxy(t)?.labels?.["orca.ports"]).toBe("");
  await forward(t.ctx, { project: "app", add: 3000, url: "https://dev.myapp.com" });
  await forward(t.ctx, { project: "app", remove: 3000 });
  expect(readFileSync(join(dir, "forwards"), "utf8")).toBe("");
  expect(t.output()).toContain("Removed http://3000.app.localhost:7320, https://dev.myapp.com");
});

test("listing shows every address, and list shows the extra ports", async () => {
  const t = fakeContext();
  project(t);
  await forward(t.ctx, { project: "app", add: 3000, url: "https://dev.myapp.com" });
  t.lines.length = 0;
  await forward(t.ctx, { project: "app" });
  expect(t.output()).toContain("http://3000.app.localhost:7320 → app:3000\nhttps://dev.myapp.com → app:3000");
  expect(t.output()).toContain("doesn't point at this Mac");
  t.lines.length = 0;
  await list(t.ctx, {});
  expect(t.output()).toContain("127.0.0.1:7320, :443");
  expect(t.output()).toContain("  https://dev.myapp.com → app:3000");
});

test("a proxy from before extra addresses is made again, with the certificate folder", async () => {
  const t = fakeContext();
  project(t);
  t.state.containers.push({ name: PROXY, running: true, labels: { "orca.port": "7320" } });
  await forward(t.ctx, { project: "app", add: 3000 });
  expect(t.calls).toContainEqual(["rm", "-f", PROXY]);
  expect(proxy(t)?.labels?.["orca.ports"]).toBe("");
});
