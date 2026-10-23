# 7. Environments and capacity

**Summary.** One small file per repo, `review.yaml`, says how to bring the project up for review;
`factory env explain` prints exactly what will run. Each task gets its own address and database.
Heavy services are shared to save RAM. More machines come later, as orca "hosts".

## The environment file

**Summary.** The same few ideas every tool converges on: services with ready checks, one-time setup
and seed, an entry point, and how to log in. It can point at an existing `compose.yaml`.

```yaml
open: web                 # what the review link opens
services:
  db:   { image: postgres:17, ready: "pg_isready -h db", ram: 512M, shared: true }
  api:  { run: "pnpm --filter api dev", port: 4000, ready: "http://:4000/health", needs: [db] }
  web:  { run: "pnpm --filter web dev", port: 3000, ready: "http://:3000", needs: [api] }
  jobs: { run: "pnpm --filter api worker", needs: [db] }
setup: ["pnpm install", "pnpm db:migrate"]
seed: "pnpm db:seed --fixture review"     # once, into a template copied per task
login: { url: "/dev/login-as?user=reviewer" }
env:  { DATABASE_URL: "postgres://db/${TASK_DB}" }
```

Closest existing formats: Ona's automations file and Claude Desktop's `.claude/launch.json`. A worker
can draft the file for you to review, as Codex cloud now does for its environments.

## How services run

**Summary.** Project containers have no Docker of their own, so this is the key choice.

- **`run:` services** are processes in the worker's container: the default, and inside orca's
  existing trust model.
- **`image:` services** are sidecar containers orca starts on the project's network, from a vetted
  subset: no mounts outside the project, no privileged mode or extra capabilities, no host network,
  no published ports, no Docker socket. A compose file written by an untrusted container could
  otherwise take over the Mac's Docker.
- Projects that truly need Docker inside: Docker Sandboxes, already an open question.

## One address and one state per task

**Summary.** `http://<port>.<task>.<project>.localhost:7320`, the existing forwards proxy one level
deeper; no ports published. Each task gets its own database, copied from a seeded template.

- Ports: a block per task inside the container.
- Databases: `CREATE DATABASE <task> TEMPLATE review_seed` (fast with file copy); Redis by key prefix.
- Separate hostnames give separate cookies, so logins don't collide.
- OAuth callbacks and webhooks need a fixed URL: one "on stage" alias the dashboard switches.
- Jobs that touch shared outside things (cron, webhooks) run per task or are off by default.

## Capacity

**Summary.** In steps: share heavy services and refuse to start what won't fit; then a container
per task; then other machines.

- **Admission:** each service declares its RAM; the factory starts an environment only if it fits,
  and queues it otherwise. Docker Desktop's memory is a fixed slider; OrbStack's grows and shrinks.
- **Container per task:** same image and home, on the project's network, each with its own limit.
- **Hosts:** a Linux box reached by `docker context` over SSH on Tailscale. Orca gains a hosts record;
  the Mac's proxy routes `*.<task>.<project>.localhost` to a proxy on that host, so the browser
  still sees only the Mac. Remote tasks need their own clone and their own logins (wider credential
  spread, the same open question as before). The box is trusted like the Mac; its containers aren't.
- **Cost, roughly:** a 128 GB Hetzner box about €120–300 a month (sources conflict); Daytona about
  $0.33/hour for 4 CPUs and 8 GB.
