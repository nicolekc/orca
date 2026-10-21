import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Context } from "../context";
import type { Docker, Result } from "../docker";

export type FakeContainer = {
  name: string;
  running?: boolean;
  startedAt?: string;
  image?: string;
  labels?: Record<string, string>;
  workspace?: string;
  home?: string;
};

export type FakeState = {
  containers: FakeContainer[];
  volumes: string[];
  /** id of orca:latest, or null if the image isn't there */
  latest: string | null;
  created: Record<string, string>;
  /** what `docker pull` makes orca:latest's remote tag point at */
  pulled?: string;
  failPull?: boolean;
};

/** A docker stand-in that answers from `state` and records every command. */
export function fakeDocker(state: FakeState) {
  const calls: string[][] = [];
  const attached: string[][] = [];
  const ok = (stdout = ""): Result => ({ code: 0, stdout, stderr: "" });
  const fail = (stderr: string): Result => ({ code: 1, stdout: "", stderr });
  const find = (n: string) => state.containers.find((c) => c.name === n);

  const docker: Docker = {
    async run(args) {
      calls.push(args);
      const [cmd, ...rest] = args;
      if (cmd === "version") return ok("27.0.0");
      if (cmd === "ps") return ok(state.containers.map((c) => c.name).join("\n"));
      if (cmd === "inspect") {
        const found = rest.filter((n) => !n.startsWith("-")).map(find).filter((c) => c !== undefined);
        return ok(JSON.stringify(found.map(inspected)));
      }
      if (cmd === "image" && rest[0] === "inspect") {
        const ref = rest[rest.length - 1];
        const id = ref === "orca:latest" ? state.latest : ref;
        if (!id) return fail("No such image");
        return ok(JSON.stringify([{ Id: id, Created: state.created[id] ?? "2026-01-01T00:00:00Z" }]));
      }
      if (cmd === "rm") {
        state.containers = state.containers.filter((c) => c.name !== rest[rest.length - 1]);
        return ok();
      }
      if (cmd === "volume" && rest[0] === "inspect") return state.volumes.includes(rest[1]) ? ok("[]") : fail("no such volume");
      if (cmd === "volume" && rest[0] === "rm") {
        state.volumes = state.volumes.filter((v) => v !== rest[1]);
        return ok();
      }
      if (cmd === "pull") return state.failPull ? fail("denied") : ok();
      if (cmd === "tag") {
        if (state.pulled) state.latest = state.pulled;
        return ok();
      }
      return fail(`fake docker: unhandled ${args.join(" ")}`);
    },
    async attach(args) {
      attached.push(args);
      return 0;
    },
  };
  return { docker, calls, attached };
}

function inspected(c: FakeContainer) {
  const mounts = [];
  if (c.workspace) mounts.push({ Source: c.workspace, Destination: "/workspace" });
  if (c.home) mounts.push({ Source: c.home, Destination: "/home/node" });
  return {
    Name: "/" + c.name,
    State: { Running: c.running ?? false, StartedAt: c.startedAt ?? "0001-01-01T00:00:00Z" },
    Image: c.image ?? "sha256:new",
    Config: { Labels: c.labels ?? null },
    Mounts: mounts,
  };
}

/** A context over a fresh temp folder standing in for the Mac's home. */
export function fakeContext(state: Partial<FakeState> = {}, answers: string[] = []) {
  const home = mkdtempSync(join(tmpdir(), "orca-test-"));
  const full: FakeState = { containers: [], volumes: [], latest: "sha256:new", created: {}, ...state };
  const { docker, calls, attached } = fakeDocker(full);
  const lines: string[] = [];
  const ctx: Context = {
    docker,
    orcaDir: join(home, ".orca"),
    home,
    print: (line = "") => lines.push(line),
    ask: answers.length ? async () => answers.shift() ?? "" : null,
    color: false,
  };
  return { ctx, home, state: full, calls, attached, lines, output: () => lines.join("\n") };
}
