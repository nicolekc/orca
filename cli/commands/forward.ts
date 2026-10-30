import { existsSync, readdirSync } from "node:fs";
import { readConfig } from "../config";
import { OrcaError, projectsDir, tilde, type Context } from "../context";
import { listContainers, containerName } from "../projects";
import { allForwards, caFile, innerPort, parseAddress, pointsHere, readForwards, syncProxy, trustCommand, urlFor, writeForwards, type Address, type Forward } from "../proxy";

/** `url` adds an address for the port being added; `remove` is a port (the whole forward) or one address. */
export type ForwardOptions = { project: string; add?: number; url?: string; remove?: number | string };

/** Adds, removes or lists a project's forwards, then brings the proxy in line. */
export async function forward(ctx: Context, opts: ForwardOptions): Promise<void> {
  const names = existsSync(projectsDir(ctx)) ? readdirSync(projectsDir(ctx)) : [];
  if (!names.includes(opts.project))
    throw new OrcaError(`There's no project named "${opts.project}".`, `Projects: ${names.join(", ") || "none yet"}`);
  const port = opts.add ?? (typeof opts.remove === "number" ? opts.remove : undefined);
  if (port !== undefined && (!Number.isInteger(port) || port < 1 || port > 65535))
    throw new OrcaError(`"${port}" isn't a port: use a number from 1 to 65535.`);
  if (opts.url !== undefined && opts.add === undefined) throw new OrcaError("Give the port the URL goes to.", `orca forward <port> --url ${opts.url}`);

  const current = readForwards(ctx, opts.project);
  const line = (url: string, p: number) => `${url} → ${opts.project}:${p}`;

  if (opts.add !== undefined) {
    const add = opts.add;
    const existing = current.find((f) => f.port === add);
    const address = opts.url === undefined ? null : checkAddress(ctx, opts.project, add, parseAddress(opts.url));
    if (existing && (!address || address.url === urlFor(ctx, add, opts.project) || existing.urls.includes(address.url))) {
      ctx.print(`Already forwarded: ${line(address?.url ?? urlFor(ctx, add, opts.project), add)}`);
      return;
    }
    const next = existing
      ? current.map((f) => (f.port === add ? { ...f, urls: [...f.urls, address!.url] } : f))
      : [...current, { port: add, urls: address ? [address.url] : [] }];
    await change(ctx, opts.project, current, next);
    if (!existing) ctx.print(`✓ ${line(urlFor(ctx, add, opts.project), add)}`);
    if (address) {
      ctx.print(`✓ ${line(address.url, add)}  (paths go through as they are)`);
      await advise(ctx, address);
    }
    const container = (await listContainers(ctx)).find((c) => c.name === containerName(opts.project));
    if (!container?.running) ctx.print(`  ${opts.project} isn't running; the address works once it is: orca start`);
    return;
  }

  if (typeof opts.remove === "string") {
    const url = parseAddress(opts.remove).url;
    const f = current.find((x) => x.urls.includes(url));
    if (!f) {
      ctx.print(`${opts.project} has no forward at ${url}.`);
      return;
    }
    await change(ctx, opts.project, current, current.map((x) => (x === f ? { ...x, urls: x.urls.filter((u) => u !== url) } : x)));
    ctx.print(`Removed ${url}; port ${f.port} is still forwarded at ${urlFor(ctx, f.port, opts.project)}`);
    return;
  }

  if (opts.remove !== undefined) {
    const f = current.find((x) => x.port === opts.remove);
    if (!f) {
      ctx.print(`${opts.project} has no forward for port ${opts.remove}.`);
      return;
    }
    await change(ctx, opts.project, current, current.filter((x) => x !== f));
    ctx.print(`Removed ${[urlFor(ctx, f.port, opts.project), ...f.urls].join(", ")}`);
    if (allForwards(ctx).length === 0) ctx.print("There are no forwards left, so the proxy is stopped.");
    return;
  }

  if (current.length === 0) ctx.print(`${opts.project} has no forwards. Add one: orca forward <port>`);
  for (const f of current) {
    ctx.print(line(urlFor(ctx, f.port, opts.project), f.port));
    for (const u of f.urls) ctx.print(line(u, f.port));
  }
  for (const u of current.flatMap((f) => f.urls)) await advise(ctx, parseAddress(u), { trust: false });
}

/** Records the change and brings the proxy in line; if the proxy can't take it, puts things back as they were. */
async function change(ctx: Context, project: string, before: Forward[], after: Forward[]) {
  writeForwards(ctx, project, after);
  try {
    await syncProxy(ctx);
  } catch (e) {
    writeForwards(ctx, project, before);
    await syncProxy(ctx).catch(() => {});
    throw e;
  }
}

/** Refuses an address the proxy couldn't serve, or that another forward already has. */
function checkAddress(ctx: Context, project: string, port: number, a: Address): Address {
  const { proxyPort, servePort } = readConfig(ctx);
  if (a.port === servePort) throw new OrcaError(`Port ${a.port} is the dashboard's (servePort), so ${a.url} can't be a forward.`, "Use a URL with another port.");
  if (a.https && innerPort(ctx, a.port) === 80)
    throw new OrcaError(`Port ${a.port} serves forwards over plain HTTP, so ${a.url} can't be HTTPS on it.`, "Use http:// with that port, or another port.");
  for (const f of allForwards(ctx)) {
    const owner = `${f.project}:${f.port}`;
    const mine = f.project === project && f.port === port;
    for (const url of [urlFor(ctx, f.port, f.project), ...f.urls]) {
      const other = parseAddress(url);
      if (url === a.url && !mine) throw new OrcaError(`${a.url} already goes to ${owner}.`, `Remove it there first: orca forward --remove ${a.url} --project ${f.project}`);
      if (other.port === a.port && other.https !== a.https)
        throw new OrcaError(`Port ${a.port} already serves ${url} (${owner}), so ${a.url} can't use it too: one port is either HTTP or HTTPS.`, "Use a URL with another port.");
    }
  }
  return a;
}

/** What still has to be done outside orca for an address to open: pointing its name here, trusting its certificate. */
async function advise(ctx: Context, a: Address, opts: { trust: boolean } = { trust: true }) {
  if (!(await pointsHere(ctx, a.host))) {
    ctx.print(`! ${a.host} doesn't point at this Mac, so ${a.url} won't open here yet.`);
    ctx.print(`  Point it here, e.g. with this line in /etc/hosts:  127.0.0.1 ${a.host}`);
  }
  if (a.https && opts.trust) {
    const command = trustCommand(ctx);
    ctx.print(`  Its certificate is from orca's own certificate authority; browsers warn until this Mac trusts it.`);
    ctx.print(command ? `  If it doesn't yet, run once:  ${command}` : `  If it doesn't yet, add ${tilde(ctx, caFile(ctx))} to its trusted certificates.`);
  }
}
