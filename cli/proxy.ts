import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, sep } from "node:path";
import { caddyfile, type Server } from "./caddyfile";
import { readConfig } from "./config";
import { OrcaError, projectsDir, tilde, type Context } from "./context";
import { containerName, docker, listContainers, readFolder, recordDir } from "./projects";

/**
 * Forwards: one Caddy container, orca-proxy, is the only thing published on the Mac
 * (127.0.0.1:<proxyPort>, and the ports of any extra addresses). Each forward is a hostname,
 * http://<port>.<project>.localhost:<proxyPort>, plus any URLs it was given (orca forward --url),
 * routed to that project's container over the project's own network, which only the proxy
 * also joins. Orca starts the proxy while any project has forwards and removes it when none do.
 */
export const PROXY = "orca-proxy";
// caddy:2.11.7-alpine (released 2026-10-06), pinned by digest
export const PROXY_IMAGE = "caddy:2.11.7-alpine@sha256:d8542f48d34a9cf4e4c11a478865229840e87e4c96ea3f439101f31a5d35f75f";

export const networkName = (project: string) => `orca-net-${project}`;
export const proxyDir = (ctx: Context) => join(ctx.orcaDir, "proxy");

export const hostFor = (port: number, project: string) =>
  `${port}.${project.toLowerCase().replace(/[^a-z0-9-]/g, "-")}.localhost`;
export const urlFor = (ctx: Context, port: number, project: string) =>
  `http://${hostFor(port, project)}:${readConfig(ctx).proxyPort}`;

const forwardsFile = (ctx: Context, project: string) => join(recordDir(ctx, project), "forwards");

/** A forwarded port, and the addresses it has besides its usual one, e.g. https://dev.myapp.com. */
export type Forward = { port: number; urls: string[] };

/** A project's forwards, from its file: a line per port ("3000"), and one per extra address ("3000 https://dev.myapp.com"). */
export function readForwards(ctx: Context, project: string): Forward[] {
  const file = forwardsFile(ctx, project);
  if (!existsSync(file)) return [];
  const forwards = new Map<number, Forward>();
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const [p, url] = line.trim().split(/\s+/);
    const port = Number(p);
    if (!Number.isInteger(port) || port <= 0) continue;
    const f = forwards.get(port) ?? { port, urls: [] };
    if (url && !f.urls.includes(url)) f.urls.push(url);
    forwards.set(port, f);
  }
  return [...forwards.values()].sort((a, b) => a.port - b.port);
}

export function writeForwards(ctx: Context, project: string, forwards: Forward[]) {
  const sorted = [...forwards].sort((a, b) => a.port - b.port);
  writeFileSync(forwardsFile(ctx, project), sorted.map((f) => [`${f.port}\n`, ...f.urls.map((u) => `${f.port} ${u}\n`)].join("")).join(""));
}

/** Every project's forwards, from the records. */
export function allForwards(ctx: Context): ({ project: string } & Forward)[] {
  const dir = projectsDir(ctx);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((project) => readForwards(ctx, project).map((f) => ({ project, ...f })));
}

/** An extra address for a forward: the URL's origin, since paths go through as they are. */
export type Address = { url: string; https: boolean; host: string; port: number };

export function parseAddress(text: string): Address {
  const bad = () => new OrcaError(`"${text}" isn't a URL orca can serve a forward at.`, "Give the whole URL, starting http:// or https://, e.g. https://dev.myapp.com");
  let u: URL;
  try {
    u = new URL(text);
  } catch {
    throw bad();
  }
  if ((u.protocol !== "http:" && u.protocol !== "https:") || u.username || u.password || !u.hostname) throw bad();
  const https = u.protocol === "https:";
  return { url: u.origin, https, host: u.hostname, port: u.port ? Number(u.port) : https ? 443 : 80 };
}

/** The port inside the proxy's container that serves a Mac port: the usual addresses' is 80. */
export const innerPort = (ctx: Context, macPort: number) => (macPort === readConfig(ctx).proxyPort ? 80 : macPort);

/** Whether a hostname needs pointing at the Mac (localhost and IP addresses already do). */
export const needsPointing = (host: string) => !(host === "localhost" || host.endsWith(".localhost") || /^[\d.]+$|^\[/.test(host));

/** Whether the Mac sends a hostname to itself, as a browser there would look it up. */
export async function pointsHere(ctx: Context, host: string): Promise<boolean> {
  if (!needsPointing(host)) return true;
  return (await ctx.lookup(host)).some((a) => a.startsWith("127.") || a === "::1");
}

/** Caddy's own certificate authority (it signs the HTTPS addresses' certificates) lives in this volume, so its key never leaves Docker */
export const PROXY_DATA = "orca-proxy-data";
const CA_IN_PROXY = "/data/caddy/pki/authorities/local/root.crt";

/** The authority's certificate, copied out for the Mac to trust. */
export const caFile = (ctx: Context) => join(proxyDir(ctx), "orca-ca.crt");

/** The command that makes this Mac trust it, for the platforms orca knows one for. */
export const trustCommand = (ctx: Context) =>
  process.platform === "darwin" ? `sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ${tilde(ctx, caFile(ctx))}` : null;

/** The project whose folder contains `dir`, if any. */
export function projectAt(ctx: Context, dir: string): string | null {
  const dirs = existsSync(projectsDir(ctx)) ? readdirSync(projectsDir(ctx)) : [];
  let best: { name: string; length: number } | null = null;
  for (const name of dirs) {
    const folder = readFolder(ctx, name);
    if (folder && (dir === folder || dir.startsWith(folder + sep)) && (!best || folder.length > best.length)) best = { name, length: folder.length };
  }
  return best?.name ?? null;
}

/** Makes sure the project's own network exists. */
export async function ensureNetwork(ctx: Context, project: string): Promise<string> {
  const name = networkName(project);
  if ((await ctx.docker.run(["network", "inspect", name])).code !== 0)
    await docker(ctx, ["network", "create", "--label", `orca.network=${project}`, name]);
  return name;
}

async function projectNetworks(ctx: Context): Promise<{ name: string; subnets: string[] }[]> {
  const names = (await docker(ctx, ["network", "ls", "--filter", "label=orca.network", "--format", "{{.Name}}"])).split("\n").filter(Boolean);
  if (names.length === 0) return [];
  const nets = JSON.parse(await docker(ctx, ["network", "inspect", ...names])) as { Name: string; IPAM: { Config: { Subnet?: string }[] | null } }[];
  return nets.map((n) => ({ name: n.Name, subnets: (n.IPAM.Config ?? []).flatMap((c) => (c.Subnet ? [c.Subnet] : [])) }));
}

/** Copies the authority's certificate out of the proxy, waiting the moment Caddy takes to make it the first time. */
async function copyCa(ctx: Context) {
  for (let i = 0; i < 20; i++) {
    const r = await ctx.docker.run(["exec", PROXY, "cat", CA_IN_PROXY]);
    if (r.code === 0 && r.stdout.includes("BEGIN CERTIFICATE")) {
      const file = caFile(ctx);
      if (!existsSync(file) || readFileSync(file, "utf8") !== r.stdout) writeFileSync(file, r.stdout);
      return;
    }
    await Bun.sleep(250);
  }
}

/** The Mac ports the proxy is published on for extra addresses, besides proxyPort. */
function extraPorts(ctx: Context, forwards: Forward[]): number[] {
  const ports = forwards.flatMap((f) => f.urls.map((u) => parseAddress(u).port)).filter((p) => innerPort(ctx, p) !== 80);
  return [...new Set(ports)].sort((a, b) => a - b);
}

/** Where the proxy listens: proxyPort, and the ports of extra addresses */
export type ProxyState = { port: number; ports: number[]; running: boolean };

/** Brings the proxy in line with every project's forwards: config, port, networks, running. */
export async function syncProxy(ctx: Context): Promise<ProxyState> {
  const { proxyPort: port } = readConfig(ctx);
  const forwards = allForwards(ctx);
  let proxy = (await listContainers(ctx)).find((c) => c.name === PROXY) ?? null;

  if (forwards.length === 0) {
    if (proxy) await docker(ctx, ["rm", "-f", PROXY]);
    return { port, ports: [], running: false };
  }

  const networks = await projectNetworks(ctx);
  const servers = new Map<number, Server>([[80, { port: 80, https: false, routes: [] }]]);
  for (const f of forwards) {
    const upstream = `${containerName(f.project)}:${f.port}`;
    servers.get(80)!.routes.push({ host: hostFor(f.port, f.project), upstream });
    for (const a of f.urls.map(parseAddress)) {
      const inner = innerPort(ctx, a.port);
      if (!servers.has(inner)) servers.set(inner, { port: inner, https: a.https, routes: [] });
      servers.get(inner)!.routes.push({ host: a.host, upstream });
    }
  }
  const ports = extraPorts(ctx, forwards);
  mkdirSync(proxyDir(ctx), { recursive: true });
  writeFileSync(join(proxyDir(ctx), "Caddyfile"), caddyfile([...servers.values()], networks.flatMap((n) => n.subnets)));

  // Published ports are fixed when a container is made, so a change means a new proxy
  if (proxy && (proxy.labels["orca.port"] !== String(port) || proxy.labels["orca.ports"] !== ports.join(","))) {
    await docker(ctx, ["rm", "-f", PROXY]);
    proxy = null;
  }
  const reload = proxy?.running ?? false;
  if (!proxy) {
    const r = await ctx.docker.run([
      "run", "-d",
      "--name", PROXY,
      "--label", "orca.proxy=true",
      "--label", `orca.port=${port}`,
      "--label", `orca.ports=${ports.join(",")}`,
      "-p", `127.0.0.1:${port}:80`,
      ...ports.flatMap((p) => ["-p", `127.0.0.1:${p}:${p}`]),
      "-v", `${proxyDir(ctx)}:/etc/caddy:ro`,
      // Caddy's certificate authority, kept so the Mac's trust in it lasts
      "-v", `${PROXY_DATA}:/data`,
      PROXY_IMAGE,
    ]);
    if (r.code !== 0) {
      await ctx.docker.run(["rm", "-f", PROXY]);
      if (/address already in use|port is already allocated/i.test(r.stderr)) {
        const taken = Number(/127\.0\.0\.1:(\d+)/.exec(r.stderr)?.[1] ?? port);
        if (taken !== port) throw new OrcaError(`Port ${taken} on this Mac is already taken, so the forwards proxy can't serve addresses on it.`, "Stop what's using it, or use a URL with another port.");
        throw new OrcaError(`Port ${port} on this Mac is already taken, so the forwards proxy can't start.`, `Choose another in ${tilde(ctx, join(ctx.orcaDir, "config.json"))}: {"proxyPort": ${port + 1}}`);
      }
      throw new OrcaError(`The forwards proxy didn't start: ${r.stderr.trim()}`);
    }
    proxy = { name: PROXY, running: true, startedAt: 0, image: "", labels: {}, workspace: null, home: null, networks: [], memory: 0, cpus: 0 };
  } else if (!proxy.running) {
    await docker(ctx, ["start", PROXY]);
  }

  for (const n of networks) if (!proxy.networks.includes(n.name)) await docker(ctx, ["network", "connect", n.name, PROXY]);
  if (reload) await docker(ctx, ["exec", PROXY, "caddy", "reload", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]);
  if (forwards.some((f) => f.urls.some((u) => parseAddress(u).https))) await copyCa(ctx);
  return { port, ports, running: true };
}

/** Whether the proxy is running, without changing anything. */
export async function proxyState(ctx: Context): Promise<ProxyState> {
  const proxy = (await listContainers(ctx)).find((c) => c.name === PROXY);
  return { port: readConfig(ctx).proxyPort, ports: extraPorts(ctx, allForwards(ctx)), running: Boolean(proxy?.running) };
}
