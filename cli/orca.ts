#!/usr/bin/env bun
import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { del } from "./commands/delete";
import { forward } from "./commands/forward";
import { limits } from "./commands/limits";
import { list } from "./commands/list";
import { create } from "./commands/new";
import { start } from "./commands/start";
import { stop } from "./commands/stop";
import { update, VERSION } from "./commands/update";
import { OrcaError, realContext, type Context } from "./context";
import { keptBy } from "./present";
import { loadProjects } from "./projects";
import { serve } from "./server/serve";
import { projectAt } from "./proxy";
import { activities } from "./terminals";
import { drawView, show, VIEW_COMMAND } from "./ui/show";

const HELP = `orca: each project in its own container, with its own home

Usage:
  orca                      pick a project and start it (interactive)
  orca start [folder]       open a terminal in a folder's container (default: this one),
                            starting or creating it. Terminals keep running when their
                            window closes; with any open, it asks which to attach to.
                            The container stops when its last terminal ends.
      --new                 open a new terminal without asking
      --terminal <name>     attach to that terminal (or open it under that name)
      --fresh               recreate the container, e.g. on a newer image
      --without <feature>   leave out a feature: one that copies something from the Mac
                            when this creates the project (git-identity), or the
                            workspace-file (container-features.md)
      -- <command>          run a command in a new terminal instead of a shell,
                            e.g. -- claude --resume
  orca up [folder]          start a folder's container (creating it if need be) without a
                            terminal, to keep running until orca stop, with or without
                            terminals: for an editor attached to it, or a server
      --fresh, --without    as for start
  orca stop [project]       stop a project's container (default: this folder's), after
                            listing the terminals that ends
      --yes                 don't ask to confirm
  orca limits [project]     show a project's memory and CPUs (default: this folder's), or
                            change them, at once and without recreating its container
      --memory <amount>     e.g. 12g or 512m; "default" for the defaults again
      --cpus <n>            e.g. 6 or 1.5; "default" for the defaults again
      --defaults            show or set the defaults instead, for every project without
                            its own (orca's are 8g and 4 CPUs)
  orca serve                open the dashboard: every project, forward and session
      --no-open             print its link instead of opening the browser
  orca new <name>           make a project, its code in ~/.orca/projects/<name>/workspace
      --without <feature>   as for start
  orca list [--json]        list projects and their state
  orca delete <project>     delete a project's container
      --home                also delete its home (logins, memory, settings)
      --yes                 don't ask to confirm
  orca forward [port]       make a port in this project's container reachable from the Mac,
                            at http://<port>.<project>.localhost:7320 (no port: list them)
      --remove <port>       stop forwarding a port
      --project <name>      a project other than the one for this folder
  orca update               get the newest image, and the newest orca

Your code is never deleted. Projects are in ~/.orca/projects; settings in
~/.orca/config.json (e.g. {"proxyPort": 7320, "memory": "12g", "cpus": 6}).`;

async function main(all: string[]): Promise<number> {
  if (all[0] === VIEW_COMMAND) return drawView(all[1]);
  // Everything after `--` is a command to run in the container: orca start . -- claude
  const dd = all.indexOf("--");
  const argv = dd < 0 ? all : all.slice(0, dd);
  const inner = dd < 0 ? undefined : all.slice(dd + 1);
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      fresh: { type: "boolean" },
      new: { type: "boolean" },
      terminal: { type: "string" },
      without: { type: "string", multiple: true },
      json: { type: "boolean" },
      home: { type: "boolean" },
      yes: { type: "boolean" },
      remove: { type: "string" },
      project: { type: "string" },
      memory: { type: "string" },
      cpus: { type: "string" },
      defaults: { type: "boolean" },
      "no-open": { type: "boolean" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean" },
    },
  });
  if (values.help) return say(HELP);
  if (values.version) return say(VERSION);

  if (existsSync("/.dockerenv") || existsSync("/run/.containerenv")) {
    if (!process.env.ORCA_ALLOW_IN_CONTAINER)
      throw new OrcaError("orca manages containers from your Mac, and this is a container.", "Run it in a terminal on the Mac.");
  }

  const ctx = realContext();
  const [command, ...args] = positionals;
  const one = (what: string) => {
    if (args.length !== 1) throw new OrcaError(`orca ${command} takes one ${what}.`, `orca ${command} <${what}>`);
    return args[0];
  };

  switch (command) {
    case undefined:
      return pick(ctx);
    case "start":
      if (inner && inner.length === 0) throw new OrcaError("Nothing after --.", "orca start [folder] -- <command>");
      return start(ctx, args[0] ?? ".", { fresh: values.fresh, command: inner, new: values.new, terminal: values.terminal, without: values.without });
    case "up":
      return start(ctx, args[0] ?? ".", { up: true, fresh: values.fresh, without: values.without });
    case "stop": {
      const project = args[0] ?? projectAt(ctx, process.cwd());
      if (!project) throw new OrcaError("This folder isn't in a project.", "orca stop <project>");
      return stop(ctx, project, { yes: values.yes }).then(() => 0);
    }
    case "limits":
      if (args.length > 1) throw new OrcaError("orca limits takes one project.", "orca limits <project> --memory 12g");
      return limits(ctx, args[0] ?? (values.defaults ? null : projectAt(ctx, process.cwd())), {
        memory: values.memory,
        cpus: values.cpus,
        defaults: values.defaults,
      }).then(() => 0);
    case "new":
      return create(ctx, one("name"), { without: values.without });
    case "list":
    case "ls":
      return list(ctx, { json: values.json }).then(() => 0);
    case "delete":
    case "rm":
      return del(ctx, one("project"), { home: values.home, yes: values.yes }).then(() => 0);
    case "forward": {
      const project = values.project ?? projectAt(ctx, process.cwd());
      if (!project) throw new OrcaError("This folder isn't in a project.", "Run it from a project folder, or pass --project <name>");
      const port = (s: string | undefined) => {
        if (s !== undefined && !/^\d+$/.test(s)) throw new OrcaError(`"${s}" isn't a port: use a number from 1 to 65535.`);
        return s === undefined ? undefined : Number(s);
      };
      if (args.length > 1) throw new OrcaError("orca forward takes one port.", "orca forward <port>");
      return forward(ctx, { project, add: port(args[0]), remove: port(values.remove) }).then(() => 0);
    }
    case "serve":
      return serve(ctx, { open: !values["no-open"] });
    case "update":
      await update(ctx, { self: { version: VERSION, execPath: process.execPath, fetch, platform: process.platform, arch: process.arch } });
      return 0;
    default:
      throw new OrcaError(`There's no command "${command}".`, "See: orca --help");
  }
}

/** The picker; without a terminal, the plain list instead. */
async function pick(ctx: Context): Promise<number> {
  const projects = await loadProjects(ctx);
  if (!ctx.ask) return list(ctx, {}).then(() => 0);
  const live = await activities(ctx, projects);
  const kept = Object.fromEntries([...live].map(([name, a]) => [name, keptBy(a)]));
  const choice = (await show(join(ctx.orcaDir, "orca.log"), "picker", { projects, home: ctx.home, kept })) ?? { action: "quit" };

  switch (choice.action) {
    case "start": {
      const name = choice.project;
      const p = projects.find((x) => x.name === name)!;
      const folder = p.folder ?? p.legacy?.workspace;
      if (!folder) throw new OrcaError(`${p.name} has no project folder on record.`);
      return start(ctx, folder, {});
    }
    case "new": {
      const name = (await ctx.ask("Name for the new project: ")).trim();
      return name ? create(ctx, name) : 0;
    }
    case "delete":
      await del(ctx, choice.project, {});
      return 0;
    case "quit":
      return 0;
  }
}

function say(text: string) {
  console.log(text);
  return 0;
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (err) => {
    const red = process.stderr.isTTY && !process.env.NO_COLOR ? (s: string) => `\x1b[31m${s}\x1b[0m` : (s: string) => s;
    if (err instanceof OrcaError) {
      console.error(red(`✗ ${err.message}`));
      if (err.fix) console.error(`  ${err.fix}`);
    } else if (err?.code?.startsWith?.("ERR_PARSE_ARGS")) {
      console.error(red(`✗ ${err.message}`));
      console.error("  See: orca --help");
    } else {
      console.error(red(`✗ ${err?.stack ?? err}`));
    }
    process.exit(1);
  },
);
