// Every call to the container runtime goes through here, as `docker` commands with flags
// Podman also accepts, so the runtime stays swappable and tests can use a fake.

export type Result = { code: number; stdout: string; stderr: string };

export interface Docker {
  /** Runs docker and captures its output. */
  run(args: string[]): Promise<Result>;
  /** Runs docker attached to this terminal (for interactive shells); returns the exit code. */
  attach(args: string[]): Promise<number>;
}

/** What `docker inspect` says about a container, reduced to what Orca uses. */
export type Container = {
  name: string;
  running: boolean;
  startedAt: number; // ms since epoch, 0 if never started
  image: string; // image id
  labels: Record<string, string>;
  workspace: string | null; // host folder mounted at /workspace
  home: string | null; // host folder mounted at /home/node
  networks: string[];
  /** Its limits: memory in bytes and CPUs, 0 for none */
  memory: number;
  cpus: number;
};

export const realDocker: Docker = {
  async run(args) {
    try {
      // Detached from the terminal (its own session): orca serve runs these every few seconds,
      // and a terminal titles its window after the program in front, so it flashed "docker"
      const proc = Bun.spawn(["docker", ...args], { stdout: "pipe", stderr: "pipe", detached: true });
      const [stdout, stderr, code] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ]);
      return { code, stdout, stderr };
    } catch {
      return { code: 127, stdout: "", stderr: "docker: command not found" };
    }
  },
  async attach(args) {
    const proc = Bun.spawn(["docker", ...args], { stdio: ["inherit", "inherit", "inherit"] });
    return proc.exited;
  },
};

type Inspected = {
  Name: string;
  State: { Running: boolean; StartedAt: string };
  Image: string;
  Config: { Labels: Record<string, string> | null };
  Mounts: { Source: string; Destination: string }[];
  NetworkSettings?: { Networks?: Record<string, unknown> | null };
  HostConfig?: { Memory?: number; NanoCpus?: number };
};

export function parseContainer(c: Inspected): Container {
  // Docker Desktop sometimes reports Mac folders from inside its VM, as /host_mnt/Users/…
  const mount = (dest: string) => c.Mounts.find((m) => m.Destination === dest)?.Source.replace(/^\/host_mnt(?=\/)/, "") ?? null;
  const started = Date.parse(c.State.StartedAt);
  return {
    name: c.Name.replace(/^\//, ""),
    running: c.State.Running,
    startedAt: Number.isNaN(started) || started < 0 ? 0 : started,
    image: c.Image,
    labels: c.Config.Labels ?? {},
    workspace: mount("/workspace"),
    home: mount("/home/node"),
    networks: Object.keys(c.NetworkSettings?.Networks ?? {}),
    memory: c.HostConfig?.Memory ?? 0,
    cpus: (c.HostConfig?.NanoCpus ?? 0) / 1e9,
  };
}
