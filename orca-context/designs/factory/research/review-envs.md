# Factory research: review, environments, and scale

Research, 2026-10-23. Vendor claims weren't independently checked. **[unverified]** marks anything from memory, secondary sources, or inference.

## Top layer

1. **Evidence is plain files plus a manifest.** Each task round goes in `evidence/<task>/<round>/` (PNG per route × viewport, MP4/WebM walkthrough, Playwright trace, `manifest.json`). It lives outside git, and the dashboard and the PR both read from it.
2. **Capture with a review script the worker writes,** a Playwright spec listing routes, viewports and steps. The same script runs against the base and the branch, which gives before/after shots for free. Video comes from Playwright ≥1.59 `page.screencast` with actions and chapters; ffmpeg turns it into MP4 or GIF.
3. **Post to GitHub with `gh pr comment --attach`** (gh ≥2.99, Sept 2026). This is the first supported way to put images and video on a PR from a CLI. The dashboard's gallery is the fast path and the PR is the durable one.
4. **The environment file is one small, explainable YAML file per repo** (`review.yaml`): services (each a command, or an image), the entry URL, seed, ready checks, login, and a RAM estimate. You can point it at an existing `compose.yaml` rather than replace it. `orca review explain` prints exactly what will run.
5. **Every task gets its own hostname and its own state.** `http://<port>.<task>.<project>.localhost:7320` is the same Caddy mechanism as today, one level deeper. Each task gets its own DB (a Postgres `CREATE DATABASE … TEMPLATE seeded`) and its own compose project name. No host ports are ever published.
6. **Variations are sibling branches in one task,** shown as a grid with the same routes at the same viewports and a live link for each. Picking one keeps the winner's branch and archives the others as tags, and a "send back" note becomes the next round's input file.
7. **Add a notion of hosts only when RAM forces it.** The first remote host should be a Linux box reached by `docker context` over SSH on Tailscale. The Mac proxy routes to it, and the remote box is trusted like the Mac while its containers stay untrusted. Cloud sandboxes (Daytona, Docker Sandboxes) come later, as an optional backend.
8. **Make the factory dashboard a new screen in `orca serve`, not a new app.** It has lanes (queued → working → blocked → review → merging → done), worker chips, a review inbox with evidence thumbnails, and GitHub/CI/preview links. Steering is limited to pick, approve, send back, pause or reprioritize. It shouldn't be a place to create tasks.

---

## 1. Evidence

**Summary.** Every serious agent product now attaches proof to the PR: Copilot (Playwright MCP screenshots), Cursor cloud agents (videos, screenshots and logs, Feb 2026), and Devin ("Test the app", recordings at 2× since 2026-09-30). The useful pattern is a repeatable capture script, not ad-hoc screenshots.

**Recommended:** the worker writes `review/<task>.spec.ts` (Playwright Test). A factory runner executes it and stores the output in a local evidence store. A summary goes to the PR via `gh … --attach`.

**Capture details**
- **Screenshots:** for each route in the script, take one shot at each viewport. A sensible default is 390×844 (phone) and 1440×900 (desktop), and the list is configurable. Capture full-page plus key states (empty, error, loaded). Use `deviceScaleFactor: 2` for sharpness, as Devin did.
- **Before/after:** run the same spec against the base environment (main) and the task environment, then pair the images by name. An optional diff with Playwright's `toHaveScreenshot` or pixelmatch can highlight what changed **[unverified: worth it?]**.
- **Video:** Playwright 1.59 added `page.screencast.start/stop`, `showActions` and `showChapter`. 1.61 added a cursor option and more `video` modes, and 1.64 (2026-10-07) added `fps`, VP9, CSS-styled action labels, and video options in Playwright MCP and `playwright-cli`. Chapters make one video navigable ("1. Sign in", "2. Create invoice").
- **Recording output:** Playwright records WebM only. ffmpeg (already in the image) can make MP4 (H.264 is the safest for iOS Safari), trim the result, or make a small GIF for inline PR thumbnails.
- **Traces:** `trace: 'on'` gives the reviewer DOM, network and console for every step, viewable with `npx playwright show-trace` or trace.playwright.dev, which runs locally in the browser. These are for debugging and shouldn't be the primary review medium.
- **Why a script beats an agent clicking around:** it's re-runnable on every revision round, so round 2's shots line up with round 1's. It doubles as a regression test, and it addresses the backlog item "agents accept weak evidence".

**Where it lives**
- **Local store:** `evidence/<task>/<round>/{manifest.json, *.png, *.mp4, trace.zip}` in a gitignored folder of the project, or the project's home, which the Mac can read. The manifest is plain JSON: route, viewport, base/branch, commit SHA, captured-at, and the notes the worker wants the reviewer to see. Old rounds are never overwritten.
- **GitHub PR:** `gh pr comment --attach file.png#alt` (and `pr create/edit`) supports PNG, JPEG, GIF, WebP, SVG, MP4, MOV and WebM. Limits are 10 MB per image, and 10 MB per video on Free or 100 MB on paid plans. It needs write access and isn't on GHES. Before this there was no upload API, and the workarounds were an orphan branch, release assets, or browser automation. It doesn't say who can see attachments on private repos **[unverified]**.
- **CI artifacts** (`actions/upload-artifact`) suit CI-generated evidence, but they're slow to view (a zip download).

**Viewing quickly.** A dashboard gallery should show base and branch side by side per viewport, the video with chapter markers, and arrow keys to step through. The PR comment carries a short table of key shots plus the video.

**Trust note (important).** Evidence files come from an untrusted container. The dashboard holds the token, so never serve evidence as HTML or SVG from the dashboard's origin. Either allow only PNG/JPEG/WebP/MP4/WebM with `X-Content-Type-Options: nosniff` and `Content-Security-Policy: sandbox`, or serve evidence from a separate origin (e.g. `evidence.<project>.localhost`). Convert SVG to PNG, or drop it.

## 2. Live preview environments for complex projects

**Summary.** Every tool converges on the same few concepts: long-running *services* with a *ready* check, one-off *tasks* such as migrate or seed, dependencies, and an entry URL. Compose expresses services well, while Ona, Tilt and process-compose add the task and readiness ergonomics. Orca containers have no Docker daemon, so "how services run" is the key design choice.

**Recommended:** a small `review.yaml` (name TBD) at the repo root. Each service is either a **command** that runs as a process in the worker's container (like a Procfile, the default, which fits orca's trust model; embedded-postgres is already used this way) or an **image** that orca on the Mac starts as a sidecar on the project's network, from a vetted subset of compose keys. It can import an existing `compose.yaml`.

Sketch:
```yaml
open: web            # the service the review link points at
services:
  db:    { image: postgres:17, ready: "pg_isready -h db", ram: 512M, shared: true }
  api:   { run: "pnpm --filter api dev", port: 4000, ready: "http://:4000/health", needs: [db] }
  web:   { run: "pnpm --filter web dev", port: 3000, ready: "http://:3000", needs: [api] }
  jobs:  { run: "pnpm --filter api worker", needs: [db] }
setup:   [ "pnpm install", "pnpm db:migrate" ]
seed:    "pnpm db:seed --fixture review"      # run once into a template, then copied per task
login:   { url: "/dev/login-as?user=reviewer" } # or seeded user/password shown on the dashboard
env:     { DATABASE_URL: "postgres://db/${TASK_DB}", PUBLIC_URL: "${URL:web}" }
```
The runner fills in per-task variables: `TASK`, `TASK_DB`, `URL:<service>`, and a port offset. `orca review explain` prints the resolved commands, images, env and URLs.

**Compared**

| Option | Good at | Gaps for this use |
|---|---|---|
| docker compose | Ubiquitous. `healthcheck` plus `depends_on: service_healthy`, and `service_completed_successfully` for seed jobs. `-p` names isolate containers, networks and volumes. | Doesn't isolate host ports (parameterize or don't publish). Needs a daemon, and a compose file from an untrusted container can bind-mount the host or set `privileged`, so the Mac must vet it. |
| devcontainer.json | Standard for "the dev box" (`forwardPorts`, `postStartCommand`, compose integration). | Describes one dev container rather than a running app, and has no readiness or seed concept. Orca already decided its own container shape (see `devcontainers.md`). |
| Procfile / overmind / process-compose | Dead simple processes. process-compose adds readiness, liveness and `depends_on` conditions (the exact condition names are **[unverified]**). Devbox `services` runs on it **[unverified]**. | Processes only, and isolation is your job. |
| Tilt | `local_resource` with HTTP, TCP or exec readiness probes, `resource_deps`, and a nice UI. Tilt is joining Docker. | A Starlark Tiltfile is less "plain". Its focus is k8s. |
| Nix / devbox | Reproducible toolchains. | Solves "tools installed", not "app running for review". |
| Claude Code Desktop Preview (`.claude/launch.json`) | Prior art close to this one: `configurations[]` with `runtimeExecutable`, `runtimeArgs`, `port`, `cwd`, `env`, `autoPort`. Claude writes it and auto-verifies. | Single-server, Desktop-only. Field details are from secondary sources **[unverified]**. |
| Ona (Gitpod) `.ona/automations.yaml` | `services` (start plus a `ready` command polled until 0) and `tasks` (`dependsOn`, triggers such as `postEnvironmentStart` and `manual`). The closest to the sketch above. | Tied to Ona. |
| Vercel/Netlify previews | Per-branch URL automatically, comments on the preview (Vercel Toolbar, Netlify Drawer with screenshots and recordings), plus Neon DB-branch-per-PR. | Frontend or serverless only. They can't run background jobs or several services. |
| Codespaces / Coder / Daytona | Full remote VMs or containers per branch. | Heavy for "try this task now", and cost (see §4). |
| Codex cloud environments | Setup script plus a cached container. The new flow has Codex write an install script and a "start skill" that you review. | Their cloud only. The idea of an agent drafting env config for human review is worth copying. |

**Isolation per parallel worker**
- **Code:** one worktree or clone per task, as orca's parallel-agents research already settled.
- **Ports:** inside the container, give each task a port block (task N → base+N×100) or use `autoPort`. Nothing is published to the Mac, and orca's proxy routes by hostname.
- **URLs:** `http://<port>.<task>.<project>.localhost:7320`. `hostFor()` in `cli/proxy.ts` gains a task label, and Caddy routes it to `container:port`. Chrome and Firefox resolve any `*.localhost` to loopback, and Safari behaviour for deep names is **[unverified]**, but it's the same mechanism as today. Each task host gets its own cookie jar, so auth sessions don't collide, which is a plus.
- **Fixed-URL needs:** OAuth callbacks and webhooks need a pre-registered URL. Offer one stable alias, `http://<port>.review.<project>.localhost`, that points at whichever task is "on stage", and switch it from the dashboard.
- **DB copies:** seed once into a template DB, then `CREATE DATABASE task_x TEMPLATE review_seed`. PG15+ defaults to WAL-based copying, so use `STRATEGY FILE_COPY` for speed, and PG18 can clone near-instantly on reflink filesystems **[secondary]**. A hosted DB can use Neon branches per task (copy-on-write, seconds). Redis can use a DB index or key prefix per task, and queues a per-task name prefix.
- **Shared vs per-task:** mark heavy services `shared: true` (one Postgres server, one search index) and keep per-task state inside them. This is the main RAM lever.
- **Singletons:** cron and webhook consumers must not run twice against shared external resources. Run them per task against task-scoped state, or turn them off by default with `jobs: manual`.

**Trust for `image:` services.** Orca on the Mac starts them, so it must refuse bind mounts outside the workspace, `privileged`, `cap_add`, devices, host network or PID, published ports, and any socket mount. It should attach them only to the project network, apply resource limits, and print what it will run. The alternative is "processes only" plus Docker Sandboxes (its own daemon per microVM) for projects that need containers.

## 3. Revisions and design variations

**Summary.** Treat a variation set as one task with N sibling branches (`task/<id>/v1..vN`), each in its own worktree with its own environment. Capture the same review script for all of them. Picking one is a state change: the winner continues and the losers are archived, never deleted.

**Recommended flow**
- **Presenting:** a grid with one column per variation and rows of the same route and viewport. It needs a sync-scroll toggle, a live link per variation (`v2.<task>.<project>.localhost`), and the worker's one-line rationale per variation. A 2-up compare mode helps when N > 3.
- **Cheaper variations:** UI-only variants can share one backend and DB, so only N frontend dev servers run. The env file's `shared` flag makes this automatic.
- **Picking:** "Pick v2" (optionally with notes such as "v2, but with v3's header") does three things. The v2 branch becomes the task branch, v1 and v3 get tags such as `refs/tags/archive/<task>/v1` and their environments stop, and a revision round starts if there were notes. If there weren't, picking moves the task to review or approval.
- **Send back:** notes can be pinned to a specific screenshot or video timestamp (store the coordinates and time in the manifest). They're written as plain files (`tasks/<task>/rounds/<n>/feedback.md`, plus a JSON copy) and the worker is pinged through its tmux session, Claude Remote Control, or by watching the file. The next round's evidence goes in `<round+1>`, and the dashboard can show "round 1 vs round 2" with the same pairing logic as before/after.
- **History:** rounds are append-only. Each round records the commit SHA, evidence, feedback and decision, which gives an audit trail for "why does it look like this".
- **Approve:** this creates a "merge safely" task: rebase, CI green, re-run the review script on the merged result, merge. That's Symphony's `land` skill pattern, already in orca's research.

**Prior art.** Vercel and Netlify comment on a live preview, and their comments sync to the PR. v0 and Lovable-style "generate N, pick one" UIs exist, but I found no source here on their variation mechanics **[unverified]**.

## 4. Several test boxes / RAM

**Summary.** Today each project gets one 8 GB container, inside a Docker Desktop VM whose memory pool is fixed (by default about half the Mac's RAM). Parallel tasks with full stacks run out quickly. Scale in steps: share heavy services, give tasks their own containers, then add remote hosts. Keep the code that runs containers separate from orca's records, as `landscape-2026-10.md` already recommends.

**Recommended:** (a) right-size first with shared services and a per-service `ram:` estimate the factory schedules against. (b) If that isn't enough, give each task its own container from the same image and home on the project network (each with its own limit). (c) For more, add **hosts**: a Linux box reached as a `docker context` over SSH on Tailscale.

**Options**
- **More containers on the Mac:** it's cheap and keeps the trust model. Docker Desktop's VM memory is a fixed slider, and OrbStack releases memory dynamically (its own claim) **[vendor]**. The factory needs admission control: don't start task N+1 if the estimates exceed free memory, and queue it instead.
- **Remote Docker host over SSH (`docker context create --docker host=ssh://box`):** compose works against it (use current Compose v2). Tailscale keeps the box off the public internet **[inference]**. SSH access to the Docker daemon is root on that box, so the box must be as trusted as the Mac, and its containers must never get the socket.
- **A beefy Linux box:** a Hetzner dedicated server with 128 GB is roughly €120–300 a month after the April 2026 price rise, and the sources conflict, so check the live prices **[unverified]**. A used workstation or Mac Studio at home on Tailscale is a one-off cost.
- **Cloud VMs or workspaces:** Codespaces costs about $0.18/h for 2 cores and $0.36/h for 4 cores **[unverified, from memory]**. Daytona costs $0.0504 per vCPU-hour plus $0.0162 per GiB-hour, so 4 vCPU and 8 GiB comes to about $0.33/h, and full internet needs a higher tier. Coder is self-hosted on your own VMs (open source core) and frames itself as agent workspace infrastructure.
- **Docker Sandboxes (`sbx`):** a microVM per sandbox with its own Docker daemon, network policy, and credentials injected by the host. It's local, so it isn't more RAM, but it's the clean answer to "this project needs Docker", and it's proprietary (open questions are in `landscape-2026-10.md`).

**What orca would need**
- A `hosts` record (`~/.orca/hosts/<name>`: docker context, capacity, labels) and a `host` field on each project or task. Everything else (projects, homes, networks, forwards) stays the same, just on that host.
- **Forwards:** the Mac's Caddy can't join a remote network. Either run a Caddy on each host and have the Mac proxy route `*.<task>.<project>.localhost` to it through an SSH tunnel or a Tailscale address, or use `ssh -L` per host. The browser still sees only Mac loopback, so the dashboard's DNS-rebinding and token guards still hold.
- **Files:** a remote task needs its own clone (git push/pull between them), not a bind mount of the Mac folder. Evidence comes back by `docker cp` or rsync to the Mac's store.
- **Logins:** the remote container needs Claude/Codex/gh logins, which widens where credentials live. This is the same open question as credential-injecting proxies.
- **Trust:** remote hosts sit inside the boundary and remote containers outside it. Containers must not reach the Mac or other projects, and Tailscale ACLs should let containers out to the internet only, not across the tailnet **[inference]**.

## 5. The dashboard

**Summary.** It should be a "how work is moving" board, read-mostly, sitting beside the existing projects, terminals and forwards views in `orca serve` (same token, same shadcn UI). It shows flow and points to where the work is (GitHub, previews, terminals) rather than becoming the place where work is defined.

**Recommended contents**
- **Lanes:** queued → grouped/assigned → working → blocked → review → revising → merging → done. Each card shows the task title, group, worker (Claude or Codex, which terminal or session), age in lane, and the latest one-line status.
- **Blockers first:** a pinned strip of "needs you" items (blocked questions, review-ready, variation picks) ordered by how long they've waited. This is what you check on a phone.
- **Review inbox:** cards with an evidence thumbnail strip, a live-link button (or "start env" if it's stopped), PR link, CI status, diff size, and round number. Opening one shows the gallery from §1 and §3 with Approve, Send back and Pick buttons.
- **Workers and capacity:** who's on what, idle or busy, per-host RAM used against capacity, and environments running (with a stop button).
- **Links out:** PR, CI run, preview URL, branch, terminal (open in orca), session (Remote Control link).
- **Steering that's allowed:** reorder the queue, pause or resume a worker, stop an environment, reassign, approve, send back with notes, pick a variation. Creating, defining and discussing tasks stays in the main chat, and the dashboard just links back to the chat thread.
- **Mobile:** the "needs you" strip plus the review inbox, single column, with swipeable evidence and big Approve and Send-back targets. Live links only work on the Mac (they're loopback), so on a phone show the screenshots and video plus "open on Mac". Remote access is the open Remote Control question in `landscape-2026-10.md`.
- **State:** the board reads plain files (task records, rounds, evidence manifests) plus `gh` for PR and CI. No database is needed.

**Prior art (brief).** GitHub Agent HQ's "mission control" assigns, steers and tracks many agents (Copilot, Codex; others promised) across web, VS Code, mobile and CLI. Cursor cloud agents can be launched from web, mobile or Slack and attach artifacts to the PR. Symphony uses Linear as the board and a dumb poller. Vercel and Netlify put comments on previews, synced to the PR.

---

## Sources

- Copilot coding agent browser and screenshots: https://github.blog/changelog/2025-07-02-copilot-coding-agent-now-has-its-own-web-browser/
- Cursor cloud agents with artifacts (Feb 2026): https://cursor.com/changelog/02-24-26 · https://cursor.com/help/ai-features/background-agents · forum (recording issues): https://forum.cursor.com/tag/computer-use/373
- Devin testing and recordings: https://docs.devin.ai/work-with-devin/testing-and-recordings · https://docs.devin.ai/work-with-devin/computer-use.md · release 2026-09-30: https://www.havoptic.com/r/devin-2026-09-30
- Playwright videos: https://playwright.dev/docs/videos · releases (1.59 screencast through 1.64.1): https://github.com/microsoft/playwright/releases · Playwright CLI vs MCP cost (third party): https://morphllm.com/playwright-mcp
- gh `--attach` (2026-09-01): https://github.blog/changelog/2026-09-01-github-cli-media-in-issues-pull-requests-and-comments · earlier lack of an API: https://braindetox.kr/en/posts/gh_attach_cli_2026.html
- Ona automations: https://ona.com/docs/ona/configuration/tasks-and-services/basic-configuration
- Tilt readiness and deps: https://docs.tilt.dev/local_resource.html · https://docs.tilt.dev/resource_dependencies.html
- process-compose: https://github.com/srid/process-compose
- Compose per worktree (ports not isolated by project name): https://damln.com/tools/resources/docker-compose-per-branch · https://git.coopcloud.tech/wiki-cafe/member-console/src/commit/8065d4837aff/openspec/specs/worktree-test-stacks/spec.md · https://pypi.org/project/wco/
- Claude Code Desktop preview: https://code.claude.com/docs/en/desktop · https://www.builder.io/blog/claude-code-visual-editor
- Codex cloud environments: https://learn.chatgpt.com/docs/environments/cloud-environments.md · https://capitalandcompute.net/blog/how-codex-cloud-environments-work/
- Vercel comments and toolbar: https://vercel.com/docs/comments · Netlify Drawer: https://docs.netlify.com/deploy/review-deploys/netlify-drawer-for-feedback/overview
- Neon branch per preview: https://neon.com/branching/branch-per-preview · Postgres template cloning: https://boringsql.com/posts/instant-database-clones/ · https://aiven.io/community/forum/t/faq-why-is-database-creation-from-templates-slower-for-large-databases-in-postgresql-15/421
- Docker contexts over SSH: https://www.docker.com/blog/how-to-deploy-on-remote-docker-hosts-with-docker-compose/ · https://oneuptime.com/blog/post/2026-01-16-docker-contexts-remote-management/view · Tailscale and compose: https://aaronstannard.com/docker-compose-tailscale/
- Docker Sandboxes: https://docs.docker.com/ai/sandboxes/ · https://docs.docker.com/reference/cli/sbx/ · https://docs.docker.com/ai/sandboxes/release-notes/
- Docker Desktop memory: https://oneuptime.com/blog/post/2026-02-08-how-to-configure-docker-desktop-memory-and-cpu-limits-on-macos/view · OrbStack dynamic memory: https://orbstack.dev/blog/dynamic-memory
- Hetzner prices: https://docs.hetzner.com/robot/dedicated-server/dedicated-server-hardware/price-server-addons/ · https://heise.de/-11185981 · https://agentdeals.dev/hetzner-pricing-2026
- Daytona pricing: https://www.daytona.io/pricing · Coder: https://coder.com/blog/building-together-coder-s-community-vision-for-2026
- GitHub Agent HQ: https://github.blog/news-insights/company-news/welcome-home-agents/
- Orca internals read: `/workspace/cli/proxy.ts`, `/workspace/cli/caddyfile.ts`, `/workspace/Dockerfile`, `/workspace/container-features.md`, `/workspace/orca-context/designs/landscape-2026-10.md`, `/workspace/orca-context/designs/parallel-agents-research.md`
