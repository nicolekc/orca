#!/usr/bin/env bun
import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { render } from "ink";
import { createElement } from "react";
import { del } from "./commands/delete";
import { forward } from "./commands/forward";
import { list } from "./commands/list";
import { create } from "./commands/new";
import { start } from "./commands/start";
import { update, VERSION } from "./commands/update";
import { OrcaError, realContext, type Context } from "./context";
import { loadProjects } from "./projects";
import { serve } from "./server/serve";
import { projectAt } from "./proxy";
import { Picker, type Choice } from "./ui/picker";
import { quietConsole } from "./ui/quiet";

const HELP = `orca: each project in its own container, with its own home

Usage:
  orca                      pick a project and start it (interactive)
  orca start [folder]       start or enter the container for a folder (default: this one)
      --fresh               recreate the container, e.g. on a newer image
      -- <command>          run a command in it instead of a shell, e.g. -- claude --resume
  orca serve                open the dashboard: every project, forward and session
      --no-open             print its link instead of opening the browser
  orca new <name>           make a project, its code in ~/.orca/projects/<name>/workspace
  orca list [--json]        list projects and their state
  orca delete <project>     delete a project's container and node_modules
      --home                also delete its home (logins, memory, settings)
      --yes                 don't ask to confirm
  orca forward [port]       make a port in this project's container reachable from the Mac,
                            at http://<port>.<project>.localhost:7320 (no port: list them)
      --remove <port>       stop forwarding a port
      --project <name>      a project other than the one for this folder
  orca update               get the newest image, and the newest orca

Your code is never deleted. Projects are in ~/.orca/projects; settings in
~/.orca/config.json (e.g. {"proxyPort": 7320}).`;

async function main(all: string[]): Promise<number> {
  // Everything after `--` is a command to run in the container: orca start . -- claude
  const dd = all.indexOf("--");
  const argv = dd < 0 ? all : all.slice(0, dd);
  const inner = dd < 0 ? undefined : all.slice(dd + 1);
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      fresh: { type: "boolean" },
      json: { type: "boolean" },
      home: { type: "boolean" },
      yes: { type: "boolean" },
      remove: { type: "string" },
      project: { type: "string" },
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
      return start(ctx, args[0] ?? ".", { fresh: values.fresh, command: inner });
    case "new":
      return create(ctx, one("name"));
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
  let choice = { action: "quit" } as Choice;
  const restore = quietConsole(join(ctx.orcaDir, "orca.log"));
  try {
    const app = render(createElement(Picker, { projects, home: ctx.home, onChoose: (c: Choice) => (choice = c) }), { patchConsole: false });
    await app.waitUntilExit();
  } finally {
    restore();
  }

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
