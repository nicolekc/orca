import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, sep } from "node:path";
import { caddyfile, type Route } from "./caddyfile";
import { readConfig } from "./config";
import { OrcaError, projectsDir, tilde, type Context } from "./context";
import { containerName, docker, listContainers, readFolder, recordDir } from "./projects";

/**
 * Forwards: one Caddy container, orca-proxy, is the only thing published on the Mac
 * (127.0.0.1:<proxyPort>). Each forward is a hostname, http://<port>.<project>.localhost:<proxyPort>,
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

export function readForwards(ctx: Context, project: string): number[] {
  const file = forwardsFile(ctx, project);
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8").split("\n").map((l) => Number(l.trim())).filter((n) => Number.isInteger(n) && n > 0);
}

export function writeForwards(ctx: Context, project: string, ports: number[]) {
  writeFileSync(forwardsFile(ctx, project), [...new Set(ports)].sort((a, b) => a - b).map((p) => `${p}\n`).join(""));
}

/** Every project's forwards, from the records. */
export function allForwards(ctx: Context): { project: string; port: number }[] {
  const dir = projectsDir(ctx);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((project) => readForwards(ctx, project).map((port) => ({ project, port })));
}

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

export type ProxyState = { port: number; running: boolean };

/** Brings the proxy in line with every project's forwards: config, port, networks, running. */
export async function syncProxy(ctx: Context): Promise<ProxyState> {
  const { proxyPort: port } = readConfig(ctx);
  const forwards = allForwards(ctx);
  let proxy = (await listContainers(ctx)).find((c) => c.name === PROXY) ?? null;

  if (forwards.length === 0) {
    if (proxy) await docker(ctx, ["rm", "-f", PROXY]);
    return { port, running: false };
  }

  const networks = await projectNetworks(ctx);
  const routes: Route[] = forwards.map((f) => ({ host: hostFor(f.port, f.project), upstream: `${containerName(f.project)}:${f.port}` }));
  mkdirSync(proxyDir(ctx), { recursive: true });
  writeFileSync(join(proxyDir(ctx), "Caddyfile"), caddyfile(routes, networks.flatMap((n) => n.subnets)));

  if (proxy && proxy.labels["orca.port"] !== String(port)) {
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
      "-p", `127.0.0.1:${port}:80`,
      "-v", `${proxyDir(ctx)}:/etc/caddy:ro`,
      PROXY_IMAGE,
    ]);
    if (r.code !== 0) {
      await ctx.docker.run(["rm", "-f", PROXY]);
      if (/address already in use|port is already allocated/i.test(r.stderr))
        throw new OrcaError(`Port ${port} on this Mac is already taken, so the forwards proxy can't start.`, `Choose another in ${tilde(ctx, join(ctx.orcaDir, "config.json"))}: {"proxyPort": ${port + 1}}`);
      throw new OrcaError(`The forwards proxy didn't start: ${r.stderr.trim()}`);
    }
    proxy = { name: PROXY, running: true, startedAt: 0, image: "", labels: {}, workspace: null, home: null, networks: [], memory: 0, cpus: 0 };
  } else if (!proxy.running) {
    await docker(ctx, ["start", PROXY]);
  }

  for (const n of networks) if (!proxy.networks.includes(n.name)) await docker(ctx, ["network", "connect", n.name, PROXY]);
  if (reload) await docker(ctx, ["exec", PROXY, "caddy", "reload", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]);
  return { port, running: true };
}

/** Whether the proxy is running, without changing anything. */
export async function proxyState(ctx: Context): Promise<ProxyState> {
  const proxy = (await listContainers(ctx)).find((c) => c.name === PROXY);
  return { port: readConfig(ctx).proxyPort, running: Boolean(proxy?.running) };
}
