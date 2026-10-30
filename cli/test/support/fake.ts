import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Context } from "../../context";
import type { Docker, Result } from "../../docker";

export type FakeContainer = {
  name: string;
  running?: boolean;
  startedAt?: string;
  image?: string;
  labels?: Record<string, string>;
  workspace?: string;
  home?: string;
  networks?: string[];
  /** Open terminals, as tmux list-sessions prints them (name|attached|activity|command|host|title) */
  terminals?: string[];
  /** Marked by orca up (the mark is emptied on every start) */
  up?: boolean;
  /** Its resources: memory in bytes, CPUs (8 GB and 4 unless set) */
  memory?: number;
  cpus?: number;
  /** What docker stats says it uses, e.g. "2.1GiB" */
  used?: string;
};

export type FakeNetwork = { name: string; subnet: string; labels: Record<string, string> };

export type FakeState = {
  containers: FakeContainer[];
  volumes: string[];
  networks: FakeNetwork[];
  /** id of orca:latest, or null if the image isn't there */
  latest: string | null;
  created: Record<string, string>;
  /** Images made before terminals (no orca.terminals label), or before orca up (no orca.up) */
  noTerminals?: string[];
  noUp?: string[];
  /** what `docker pull` makes orca:latest's remote tag point at */
  pulled?: string;
  failPull?: boolean;
  /** Mac ports something else is listening on, so publishing them fails */
  taken?: number[];
  /** What Docker has in all (docker info); 16 GB and 10 CPUs unless set */
  total?: { memory: number; cpus: number };
};

/** A docker stand-in that answers from `state` and records every command. */
export function fakeDocker(state: FakeState) {
  const calls: string[][] = [];
  const attached: string[][] = [];
  const ok = (stdout = ""): Result => ({ code: 0, stdout, stderr: "" });
  const fail = (stderr: string): Result => ({ code: 1, stdout: "", stderr });
  const find = (n: string) => state.containers.find((c) => c.name === n);
  const imageLabels = (id: string): Record<string, string> =>
    state.noTerminals?.includes(id) ? {} : state.noUp?.includes(id) ? { "orca.terminals": "1" } : { "orca.terminals": "1", "orca.up": "1" };

  function network([sub, ...a]: string[]): Result {
    const net = (n: string) => state.networks.find((x) => x.name === n);
    if (sub === "ls") {
      const label = a[a.indexOf("--filter") + 1].replace(/^label=/, "");
      return ok(state.networks.filter((n) => label in n.labels).map((n) => n.name).join("\n"));
    }
    if (sub === "inspect") {
      const found = a.map(net);
      if (found.some((n) => !n)) return fail("network not found");
      return ok(JSON.stringify(found.map((n) => ({ Name: n!.name, IPAM: { Config: [{ Subnet: n!.subnet }] } }))));
    }
    if (sub === "create") {
      const [k, v] = a[a.indexOf("--label") + 1].split("=");
      state.networks.push({ name: a[a.length - 1], subnet: `172.${20 + state.networks.length}.0.0/16`, labels: { [k]: v } });
      return ok();
    }
    if (sub === "connect" || sub === "disconnect") {
      const [n, c] = a;
      const target = find(c);
      if (!target || !net(n)) return fail("not found");
      target.networks ??= [];
      if (sub === "connect") {
        if (target.networks.includes(n)) return fail(`endpoint with name ${c} already exists in network ${n}`);
        target.networks.push(n);
      } else target.networks = target.networks.filter((x) => x !== n);
      return ok();
    }
    if (sub === "rm") {
      state.networks = state.networks.filter((n) => n.name !== a[0]);
      return ok();
    }
    return fail(`fake docker: unhandled network ${sub}`);
  }

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
        return ok(JSON.stringify([{ Id: id, Created: state.created[id] ?? "2026-01-01T00:00:00Z", Config: { Labels: imageLabels(id) } }]));
      }
      if (cmd === "rm") {
        state.containers = state.containers.filter((c) => c.name !== rest[rest.length - 1]);
        return ok();
      }
      if (cmd === "volume" && rest[0] === "inspect") return state.volumes.includes(rest[1]) ? ok("[]") : fail("no such volume");
      if (cmd === "volume" && rest[0] === "rm") {
        if (!state.volumes.includes(rest[1])) return fail("no such volume");
        state.volumes = state.volumes.filter((v) => v !== rest[1]);
        return ok();
      }
      if (cmd === "network") return network(rest);
      if (cmd === "run" && rest[0] === "-d") {
        const flag = (f: string) => rest.flatMap((a, i) => (a === f ? [rest[i + 1]] : []));
        const taken = flag("-p").map((p) => Number(p.split(":")[1])).find((p) => state.taken?.includes(p));
        if (taken) return fail(`Bind for 127.0.0.1:${taken} failed: port is already allocated`);
        // Like Docker, the container gets the image's labels too
        const labels = { ...imageLabels(state.latest!), ...Object.fromEntries(flag("--label").map((l) => l.split("=") as [string, string])) };
        const limit = (f: string) => rest.find((a) => a.startsWith(`${f}=`))?.slice(f.length + 1);
        state.containers.push({ name: flag("--name")[0], running: true, image: state.latest!, labels, networks: [], memory: Number(limit("--memory")), cpus: Number(limit("--cpus")) });
        return ok("id");
      }
      if (cmd === "update") {
        const c = find(rest[rest.length - 1]);
        if (!c) return fail("No such container");
        for (const a of rest) {
          if (a.startsWith("--memory=")) c.memory = Number(a.slice(9));
          if (a.startsWith("--cpus=")) c.cpus = Number(a.slice(7));
        }
        return ok(c.name);
      }
      if (cmd === "info") {
        const t = state.total ?? { memory: 16 * 1024 ** 3, cpus: 10 };
        return ok(`${t.memory} ${t.cpus}\n`);
      }
      if (cmd === "stats") {
        const c = find(rest[rest.length - 1]);
        return c?.running ? ok(`${c.used ?? "1GiB"} / ${c.memory}B\n`) : fail("not running");
      }
      if (cmd === "start") {
        const c = find(rest[rest.length - 1]);
        if (c) (c.running = true), (c.up = false);
        return c ? ok() : fail("No such container");
      }
      if (cmd === "stop") {
        const c = find(rest[rest.length - 1]);
        if (c) (c.running = false), (c.up = false);
        return c ? ok() : fail("No such container");
      }
      // The mark and the terminals together, as orca asks for them (terminals.ts)
      if (cmd === "exec" && rest.some((a) => a.includes("list-sessions"))) {
        const c = find(rest[0]);
        const lines = [...(c?.up ? ["up"] : []), ...(c?.terminals ?? [])];
        return { code: c?.terminals?.length ? 0 : 1, stdout: lines.map((l) => l + "\n").join(""), stderr: c?.terminals?.length ? "" : "no server running" };
      }
      if (cmd === "exec" && rest.includes("touch")) {
        const c = find(rest[0]);
        if (!c?.running || c.labels?.["orca.up"] !== "1") return fail("touch: cannot touch '/run/orca/up': No such file or directory");
        c.up = true;
        return ok();
      }
      // The proxy's certificate authority, as Caddy makes it
      if (cmd === "exec" && rest.some((a) => a.endsWith("root.crt"))) return ok("-----BEGIN CERTIFICATE-----\nfake\n-----END CERTIFICATE-----\n");
      if (cmd === "exec") return ok();
      if (cmd === "tag") {
        if (state.pulled) state.latest = state.pulled;
        return ok();
      }
      return fail(`fake docker: unhandled ${args.join(" ")}`);
    },
    async attach(args) {
      attached.push(args);
      if (args[0] === "pull") return state.failPull ? 1 : 0;
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
    NetworkSettings: { Networks: Object.fromEntries((c.networks ?? []).map((n) => [n, {}])) },
    HostConfig: { Memory: c.memory ?? 8 * 1024 ** 3, NanoCpus: (c.cpus ?? 4) * 1e9 },
  };
}

/** A context over a fresh temp folder standing in for the Mac's home. */
/** `answers` answer `ask` and `choose` in turn; for `choose`, an option's value, or null to quit. */
/** `names` are what hostnames look up to on the Mac (as /etc/hosts would say). */
export function fakeContext(state: Partial<FakeState> = {}, answers: (string | null)[] = [], host: Record<string, string> = {}, names: Record<string, string[]> = {}) {
  const home = mkdtempSync(join(tmpdir(), "orca-test-"));
  const full: FakeState = { containers: [], volumes: [], networks: [], latest: "sha256:new", created: {}, ...state };
  const { docker, calls, attached } = fakeDocker(full);
  const lines: string[] = [];
  const launched: string[][] = [];
  const ctx: Context = {
    docker,
    orcaDir: join(home, ".orca"),
    home,
    print: (line = "") => lines.push(line),
    ask: answers.length ? async () => answers.shift() ?? "" : null,
    choose: answers.length
      ? async (question, options) => {
          lines.push(question, ...options.map((o) => `  ${o.label}`));
          const answer = answers.shift() ?? null;
          return options.some((o) => o.value === answer) ? answer : null;
        }
      : null,
    color: false,
    launch: async (argv) => void launched.push(argv),
    host: async (argv) => {
      const key = argv.join(" ");
      return key in host ? { code: 0, stdout: host[key] + "\n", stderr: "" } : { code: 1, stdout: "", stderr: "" };
    },
    lookup: async (hostname) => names[hostname] ?? [],
  };
  return { ctx, home, state: full, calls, attached, lines, launched, output: () => lines.join("\n") };
}
