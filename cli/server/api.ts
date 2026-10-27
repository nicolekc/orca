import { del } from "../commands/delete";
import { start } from "../commands/start";
import { stop } from "../commands/stop";
import { forward } from "../commands/forward";
import { settings } from "../commands/settings";
import { makeRecord } from "../commands/new";
import { OrcaError, tilde, type Context } from "../context";
import { stateOf, type State } from "../present";
import { inspectImage, latestImage, loadProjects, type Project } from "../projects";
import { dockerTotal, effective, memoryUsed, readBoxSettings, type BoxSettings, type Effective, type Resources } from "../box-settings";
import { allForwards, proxyState, urlFor } from "../proxy";
import { listSessions, type Session } from "../sessions";
import { openInTerminal } from "../terminal";
import { activities, activity, canKeepUp, hasTerminals, listTerminals, type Activity, type Terminal } from "../terminals";

/** What the dashboard shows for a project. */
export type ProjectView = {
  name: string;
  folder: string | null;
  state: State;
  imageUpdate: boolean;
  managed: boolean;
  forwards: { port: number; url: string }[];
  /** How many terminals are open in its container */
  terminalCount: number;
  /** Started with orca up: it runs until stopped, terminals or not */
  keptUp: boolean;
  /** Its container can be kept up (it's from an image with orca up) */
  canKeepUp: boolean;
  lastUsed: number;
};
export type ProjectDetail = ProjectView & {
  sessions: Session[];
  /** Open terminals; null when its container is from an image before terminals */
  terminals: Terminal[] | null;
  image: { container: string | null; newest: string | null };
};
/** A project's box settings: what its container gets and where each comes from, its own, what it uses, and what Docker has in all */
export type BoxSettingsView = Effective & { own: BoxSettings; used: string | null; total: Resources | null };
export type ActionResult = { messages: string[] };
export type ApiError = { error: string; fix?: string };

/** The dashboard's JSON API over the same core as the command line. Requests are already guarded. */
export function createApi(ctx: Context, opts: { orca: string; version: string }) {
  return async (req: Request): Promise<Response | null> => {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
    if (parts[0] !== "api") return null;
    try {
      return Response.json(await route(req.method, parts.slice(1), req));
    } catch (e) {
      if (e instanceof NotFound) return Response.json({ error: e.message, fix: e.fix } satisfies ApiError, { status: 404 });
      if (e instanceof OrcaError) return Response.json({ error: e.message, fix: e.fix } satisfies ApiError, { status: 400 });
      return Response.json({ error: String((e as Error)?.message ?? e) } satisfies ApiError, { status: 500 });
    }
  };

  async function route(method: string, [what, name, action, arg]: string[], req: Request): Promise<unknown> {
    if (method === "GET" && what === "info") return { version: opts.version, proxy: await proxyState(ctx) };
    if (method === "GET" && what === "sessions")
      return (await loadProjects(ctx)).flatMap((p) => listSessions(ctx, p.name)).sort((a, b) => b.updated - a.updated).slice(0, 200);
    if (what !== "projects") throw new NotFound("No such API.");

    if (!name) {
      if (method === "GET") {
        const projects = await loadProjects(ctx);
        const live = await activities(ctx, projects);
        return projects.map((p) => view(p, live.get(p.name)));
      }
      if (method === "POST") {
        const workspace = makeRecord(ctx, String((await json(req)).name ?? ""));
        await openInTerminal(ctx, [opts.orca, "start", workspace]);
        return done(`Opening ${tilde(ctx, workspace)} in a terminal.`);
      }
    }

    const projects = await loadProjects(ctx);
    const p = projects.find((x) => x.name === name);
    if (!p) throw new NotFound(`There's no project named "${name}".`, `Projects: ${projects.map((x) => x.name).join(", ") || "none yet"}`);

    if (method === "GET" && !action) {
      const latest = await latestImage(ctx);
      const container = p.container ? ((await inspectImage(ctx, p.container.image))?.created ?? null) : null;
      const live = p.container?.running && hasTerminals(p.container) ? await activity(ctx, p.container.name) : undefined;
      const terminals = p.container && !hasTerminals(p.container) ? null : (live?.terminals ?? []);
      return { ...view(p, live), sessions: listSessions(ctx, p.name), terminals, image: { container, newest: latest?.created ?? null } } satisfies ProjectDetail;
    }
    const b = method === "GET" ? {} : await json(req);

    if (method === "POST" && action === "open") {
      const folder = startable(p);
      const session = b.session;
      if (session !== undefined) {
        if (typeof session !== "string" || !listSessions(ctx, p.name).some((s) => s.id === session))
          throw new OrcaError(`${p.name} has no session ${String(session)}.`);
        await openInTerminal(ctx, [opts.orca, "start", folder, "--", "claude", "--resume", session]);
        return done(`Resuming the session in a new terminal.`);
      }
      const terminal = b.terminal;
      if (terminal !== undefined) {
        const open = p.container?.running ? await listTerminals(ctx, p.container.name) : [];
        if (typeof terminal !== "string" || !open.some((t) => t.name === terminal)) throw new OrcaError(`${p.name} has no open terminal ${String(terminal)}.`);
        await openInTerminal(ctx, [opts.orca, "start", folder, "--terminal", terminal]);
        return done(`Attaching to terminal ${terminal} in a window.`);
      }
      await openInTerminal(ctx, [opts.orca, "start", folder, "--new"]);
      return done(`Opening a new terminal in ${p.name}.`);
    }
    // Just the outcome: not what starting it printed on the way
    if (method === "POST" && action === "up") return { messages: (await capture((c) => start(c, startable(p), { up: true }))).messages.slice(-1) };
    // The page's confirmation already listed the terminals it ends: just the outcome
    if (method === "POST" && action === "stop") return { messages: (await capture((c) => stop(c, p.name, { yes: true }))).messages.slice(-1) };
    if (method === "POST" && action === "recreate") {
      const folder = startable(p);
      if (p.container?.running) throw new OrcaError(`${p.name} is running.`, "Stop it first, then recreate it.");
      await openInTerminal(ctx, [opts.orca, "start", "--fresh", folder]);
      return done(`Recreating ${p.name} in a terminal.`);
    }
    if (action === "settings" && method === "GET") {
      const used = p.container?.running ? await memoryUsed(ctx, p.container.name) : null;
      return { ...effective(ctx, p.name), own: readBoxSettings(ctx, p.name), used, total: await dockerTotal(ctx) } satisfies BoxSettingsView;
    }
    if (action === "settings" && method === "POST") {
      const text = (v: unknown) => (v === undefined ? undefined : typeof v === "string" ? v : String(v));
      // The page shows what Docker has beside the form already
      const r = await capture((c) => settings(c, p.name, { memory: text(b.memory), cpus: text(b.cpus) }));
      return { messages: r.messages.filter((m) => !m.startsWith("Docker has")) };
    }
    if (action === "forwards" && method === "POST") return capture((c) => forward(c, { project: p.name, add: port(b.port) }));
    if (action === "forwards" && method === "DELETE" && arg) return capture((c) => forward(c, { project: p.name, remove: port(arg) }));
    if (method === "POST" && action === "delete") {
      if (b.confirm !== p.name) throw new OrcaError(`Type ${p.name} to confirm deleting it.`);
      return capture((c) => del(c, p.name, { home: b.home === true, yes: true }));
    }
    throw new NotFound("No such API.");
  }

  function view(p: Project, live?: Activity): ProjectView {
    return {
      name: p.name,
      folder: p.folder ? tilde(ctx, p.folder) : null,
      state: stateOf(p),
      imageUpdate: p.outdated,
      managed: p.managed,
      forwards: allForwards(ctx).filter((f) => f.project === p.name).map((f) => ({ port: f.port, url: urlFor(ctx, f.port, p.name) })),
      terminalCount: live?.terminals.length ?? 0,
      keptUp: live?.up ?? false,
      // A project without a container yet gets the newest image's
      canKeepUp: p.container ? canKeepUp(p.container) : true,
      lastUsed: Math.max(p.container?.startedAt ?? 0, p.legacy?.startedAt ?? 0),
    };
  }

  /** The folder to start, or why it can't be started from here. */
  function startable(p: Project): string {
    if (!p.container && p.legacy)
      throw new OrcaError(`${p.name} still has its container from before project homes, ${p.legacy.name}.`, `Migrate it first: ~/orca/orca-migrate.sh ${p.folder ? tilde(ctx, p.folder) : ""}`.trim());
    if (!p.folder) throw new OrcaError(`${p.name} has no project folder on record.`);
    return p.folder;
  }

  /** Runs a command, collecting what it would have printed. */
  async function capture(fn: (c: Context) => Promise<unknown>): Promise<ActionResult> {
    const messages: string[] = [];
    await fn({ ...ctx, print: (l = "") => messages.push(l), ask: null, choose: null });
    return { messages };
  }
}

const done = (message: string): ActionResult => ({ messages: [message] });

function port(v: unknown): number {
  const s = String(v);
  if (!/^\d+$/.test(s)) throw new OrcaError(`"${s}" isn't a port: use a number from 1 to 65535.`);
  return Number(s);
}

async function json(req: Request): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (!text) return {};
  try {
    const v = JSON.parse(text);
    return v && typeof v === "object" ? v : {};
  } catch {
    throw new OrcaError("The request body isn't valid JSON.");
  }
}

class NotFound extends Error {
  constructor(
    message: string,
    readonly fix?: string,
  ) {
    super(message);
  }
}
