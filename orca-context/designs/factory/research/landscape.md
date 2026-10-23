# Software factory: landscape, reuse, constraints

Researched 2026-10-23. Anthropic and OpenAI docs were read directly that day. Third-party claims are marked (2nd-hand). Claims I couldn't verify are marked **[unverified]**.

## Top layer

1. **Claude Projects** (public beta on Pro/Max) is the closest first-party match: one planning conversation starts parallel "threads", has an Overview of what needs you, PR buttons (Fix CI / Merge it), and desktop notifications. It can run a thread on your own machine through `claude remote-control --spawn worktree`, so an orca container could host those threads. It doesn't do Codex, has no explicit task grouping, is single-user, and has no live preview links.
2. **Orchestrator.inc** (Apache-2.0, formerly Composio's agent-orchestrator) is the closest open-source match: a planning orchestrator, workers in worktrees for Claude/Codex/20+ agents, a live kanban, an in-app browser preview, and PR/CI/review state. Its desktop app spawns the workers itself.
3. **No tool found groups a batch of queued tasks by how they overlap before dispatching them.** Each tool maps one task to one worker. Grouping happens only through a coordinator's judgment (Claude Projects), hand-made bundles (Gas Town convoys), or at merge time (Gas Town Refinery). That, plus a mixed pool of Claude and Codex workers that the user opens themselves, is the open gap.
4. **Subscription verdict:** running the *unmodified* `claude` CLI signed in with your *own* subscription is permitted, including background sessions, `/loop`, channels, Remote Control and, per the support article updated 2026-10-07, `claude -p` and the Agent SDK. Having the user open each worker is therefore **safe, not required**. The real constraints are the 5-hour and weekly usage limits, plus the "ordinary, individual usage" and "no automated access unless explicitly permitted" wording, which is ambiguous for a 24/7 daemon.
5. **Forbidden:** offering Claude.ai login inside your own app, routing other people's requests through your plan, collecting or storing session tokens, and modifying the binary. If other engineers use the factory, each signs in to their own `claude`/`codex`. A factory built *on the Agent SDK as a product* should use API keys, per the legal page.
6. **Waking an idle worker is solved by first-party tools.** Claude has channels (MCP push into a running session), cross-session messaging (works between sessions *in the same container*, never container↔host), and the Monitor tool / self-paced `/loop`. Codex has `codex queue --thread <id>` and its app-server. orca doesn't need to inject keystrokes into tmux.
7. **Reuse:** GitHub Issues (labels, sub-issues, dependencies) as the durable queue the team can see; orca terminals and Remote Control for steering; orca forwards for previews; GitHub merge queue / auto-merge plus a "land" skill (Symphony's pattern) for "merge it safely". Build: claiming, grouping, routing by agent type, the review/variation surface, and test-box capacity.
8. **Standards worth adopting:** AGENTS.md (already used by orca; now under the Linux Foundation's Agentic AI Foundation), Agent Skills (SKILL.md; worker roles become skills that work in both Claude and Codex), and MCP (a queue server both agents can call; channels are MCP). Skip A2A for now.

---

## 1. Prior art

**Summary:** Most of the idea exists somewhere. Parallel workers in worktrees, kanban review, previews and steering are common. A planning chat that delegates exists in Claude Projects, Orchestrator.inc and Gas Town's "Mayor". What's missing is overlap-aware batching, a subscription-friendly pool of user-opened Claude and Codex workers, and a fit with orca's per-project container boundary.

### First-party: Anthropic (Claude Code docs, read 2026-10-23)

| Feature | Covers | Notes |
|---|---|---|
| **Claude Projects** (public beta, Pro/Max; not Team/Enterprise; not in the CLI) | Main chat → parallel threads; Overview (ready for review / waiting on you / landing); PR cards with Resolve conflicts / Fix CI / Merge it; auto-fix watches PRs; desktop notifications; scheduled tasks per project | Threads run in the cloud by default. "Work locally" runs a thread through Remote Control on your machine (`claude remote-control --spawn worktree`, v2.1.280+). Thread limits are preferences, not caps; the hard limit is 200 new threads/day. Single user, no sharing. Local threads are blocked while **Require trusted devices** is on, which conflicts with the passkey/Trusted Devices advice in orca's landscape-2026-10.md. Claude only. |
| **Agent view** (`claude agents`, `claude --bg`; research preview) | Dispatch and monitor many local background sessions; states such as Needs input / Completed; peek and reply; attach; PR badge; notifications via `preferredNotifChannel` and the `Notification` hook | A supervisor daemon runs the sessions and they survive the terminal closing. Each session moves into its own worktree and opens a draft PR when done. Idle sessions are stopped after about 1h unless pinned. "Each session draws on your subscription quota independently." You start each session yourself. |
| **Agent teams** (experimental, off by default) | Lead plus teammates, a shared task list with dependencies and file-locked claiming, mailboxes, `TaskCreated`/`TaskCompleted` hooks | Interactive sessions only (not `-p` or the SDK). One team per session, no resume, no worktree per teammate, about 7× the tokens. A good model for claiming, but not for long-lived workers. |
| **Cross-session messaging** (v2.1.224+) | `ListAgents`/`SendMessage` between your sessions; idle notices; `claude -p` workers can receive | Same machine: a Unix socket, never through Anthropic. Other machines and cloud: only through Remote Control. **"A session inside a container and a session on the host can't reach each other. Two sessions inside the same container can still message each other."** Sessions that bypass permissions *hold* incoming messages unless the sender also bypasses; set `crossSessionInbound: accept` on workers. Plain text only, about 1M characters per message, 50 messages queued. |
| **Channels** (research preview) | An MCP server pushes events into a *running* session (Telegram/Discord/iMessage are official; custom webhook channels are possible); permission relay to your phone | During the preview only allowlisted plugins register. A custom channel needs `--dangerously-load-development-channels`. Pro/Max users without an org skip the org gate. Fits "ping me on my phone and let me answer". |
| **Remote Control** | Steer a local session from the phone or web; mobile push notifications; server mode `claude remote-control --spawn worktree --capacity N` (default 32) | Needs a full claude.ai login (not `setup-token`, not an API key). Works from containers (orca already uses it). |
| **`/loop`, Cron tools, Monitor** | Self-paced or interval polling inside a session; Monitor streams a script's output lines (cheaper than polling) | Session-scoped, 50 tasks per session, recurring tasks expire after 7 days, 1-minute minimum interval. Each fire re-sends the full context. |
| **Scheduled tasks** (formerly routines) | Cloud runs on a cron schedule, an API `/fire` call, or GitHub PR/release events | Cloud clone only, so no local dev env. 100 runs/hour per account; minimum interval 1h. Counts against the subscription. |
| **GitHub Actions** (`claude-code-action`) | Issue/PR-triggered runs; `@claude` | Officially supports a subscription via `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token`. |
| `/batch`, dynamic workflows | One large change split into 5–30 worktree subagents; scripted fan-out with cross-checking | Within one session. |

### First-party: OpenAI Codex (docs read 2026-10-23)

- **CLI** (Apache-2.0, `openai/codex`):
  - Stable: `codex exec` (non-interactive, JSONL), `codex queue --thread <id|name> --message …` (queues a message into an *existing* session, also works remotely), `codex agents` (command center over a local or remote shared server), `codex review`.
  - Experimental: `codex app-server` (JSON-RPC over stdio, WebSocket or Unix socket), `codex remote-control` (daemon plus pairing code), `codex cloud`.
- **Codex Cloud** and the **/agents view** (DevDay 2026-09-29, 2nd-hand): cloud tasks keep running with the laptop closed, can be steered from the phone, and named sessions are shared with ChatGPT's agent view.
- **Symphony** (Apache-2.0, released 2026-04-28, about 28k stars, "engineering preview"):
  - A daemon polls Linear and gives each issue a workspace and a Codex app-server run.
  - Agents attach "proof of work" (CI, review feedback, complexity analysis, **walkthrough videos**), then land the PR with a `land` skill.
  - OpenAI presents it as a SPEC.md to reimplement. Already analysed in `orca-context/designs/parallel-agents-research.md`.

### Third-party (GitHub stats taken 2026-10-23 via `gh`)

| Tool | License | Queue | Grouping | Parallel | Review / preview | Steering | Claude subscription? |
|---|---|---|---|---|---|---|---|
| **Orchestrator.inc** (`OrchestratorInc/agent-orchestrator`, 13.5k★, active) | Apache-2.0 | Tasks from orchestrator | Orchestrator plans and splits; no batching found | Worktree workers, 20+ agents | Kanban derived from PR/CI/review; isolated browser preview | Chat or native TUI per worker | Runs the agents' own CLIs, so yes **[how auth works not verified]** |
| **Gas Town** + **Beads** (`gastownhall/*`, 18k★ / 28k★, MIT) | MIT | Beads: Dolt-backed dependency graph, `bd ready`, atomic `--claim`, MCP server | Convoys are hand-made bundles; the Refinery batches *merges* (Bors-style bisecting queue) | 20–30 tmux agents; capacity governor | — | Mayor chat; escalation by severity | Runs the CLIs in tmux. Heavy invented vocabulary (an anti-pattern listed in orca's CLAUDE.md). |
| **Superset** (15k★) | not stated | — | — | Many agents, worktrees | Diffs, browser preview with "Design mode" element picking, PR line comments → agent, shareable Pages | Yes | "your own subscription" (README) |
| **Vibe Kanban** (BloopAI, 28k★) | Apache-2.0 | Kanban issues | — | Worktree workspaces, 10+ agents | Inline diff comments, dev server, browser preview | Yes | Uses agent CLIs. **Sunsetting** (company shut down April 2026; the repo now carries a sunset banner). |
| **Conductor** (Mac, YC) | Proprietary | — | — | Worktree workspaces; Conductor Cloud microVMs | Diff, checks, PR | Yes | Your subscription or key (2nd-hand) |
| **HumanLayer** (11.7k★) | Apache-2.0 | Tasks synced across team | — | Daemon per host runs Claude/Codex/OpenCode/Pi | Plans, reviews | Desktop/web, team | Runs the CLIs on your hosts |
| **claude-squad** (8.7k★) | AGPL-3.0 | — | — | tmux + worktrees | — | Attach | Yes (runs the CLI) |
| **Crystal → Nimbalyst** | MIT (Crystal) | — | — | Worktrees | — | Yes | Yes |
| **Sculptor** (Imbue) | MIT | — | — | Workspaces; agents can share a workspace | Skills (spec, mocks, fix-bug) | Yes | Yes **[unverified]** |
| **Terragon** | Apache-2.0 (oss dump) | — | — | Cloud background agents | — | — | **Shut down**; repo frozen Feb 2026 |
| **herdr** (45k★) | Apache-2.0 | — | — | Multiplexer for agents | — | — | Viewer layer (see `designs/herdr.md`) |
| **Backlog.md** (7k★) | MIT | Markdown tasks in git, board, MCP | — | — | — | — | Agent-neutral |
| **GitHub Agent HQ / Copilot coding agent** | Proprietary | Issues → agent → draft PR; Mission Control | Assign several agents to one task and **compare** solutions | Cloud | PRs | Web, VS Code, mobile | Copilot subscription (Claude and Codex in public preview on Pro+/Enterprise since Feb 2026, 2nd-hand), *not* a Claude subscription |
| Devin, Factory Droids, Cursor background agents | Proprietary | Slack/Linear/GitHub triggers | — | Cloud | PRs, (Devin) videos | Web | Their own billing (2nd-hand pricing, Apr 2026) |
| OpenHands (91k★) | MIT | Issue resolver | — | Local/cloud | — | — | LLM API keys; **[driving Claude Code under a subscription not verified]** |
| Sweep | — | — | — | — | — | — | Pivoted to a JetBrains assistant; not relevant |

---

## 2. Reuse vs build

**Summary:** Adopt GitHub (issues for the queue, PRs, merge queue), the agents' own first-party wake/steer/notify features, orca's terminals and forwards, Playwright for artifacts, and Agent Skills for worker roles. Build a thin claim/group/route layer and the review surface. Don't build a multiplexer, chat UI or notification transport.

**Adopt**
- **Queue = GitHub Issues** by default: team-visible, linkable from the dashboard, and reachable from containers with `gh`.
  - Labels mark state (`ready`) and routing (`agent:codex` / `agent:claude`). Sub-issues and "blocked by" dependencies cover ordering.
  - Caveat: labels and assignees aren't an atomic claim, so a claim needs one owner (an orca-side lock or a single dispatcher). Agent teams use file locks for the same reason.
  - Offline/no-GitHub fallback: files in the repo, in the style of Backlog.md or Beads. Beads brings Dolt, which is heavy.
  - Keep the factory's own record format small, so the framework's PRD JSON stays optional.
- **Waking and steering workers**:
  - Claude: Monitor (a queue-watch script that prints when work is ready) or channels; cross-session messaging for main-chat ↔ worker talk inside one project container.
  - Codex: `codex queue`, app-server.
  - Steering: orca terminals (tmux attach), Remote Control, `claude attach`, `codex agents --remote`.
- **Notifications**: Remote Control mobile push and agent-view notifications; channels (Telegram/Discord/iMessage) for two-way answers from the phone. Don't build a push service.
- **Previews**: orca forwards (`http://<port>.<project>.localhost:7320`) per worker. For multi-service projects, one Docker Compose project name per worktree (configurable). Remote viewing via Tailscale Serve is already noted in orca's design notes.
- **Review artifacts**: Playwright (MCP or the test runner) for screenshots and video. Symphony's "proof of work" list is a good checklist.
- **Merge it safely**: GitHub auto-merge or merge queue, branch protection, and a `land` skill (Symphony). A Refinery-style bisecting queue only if merge conflicts become common.
- **Overlap with Claude Projects**: offer "use Projects" as the path for Claude-only users. Orca's addition is the container host for local threads, plus Codex.

**Build (the actual gap)**
1. **Batch grouping**: when several tasks are ready, one planner pass predicts which files and areas each touches and how the tasks depend on each other, groups overlapping ones into a single unit of work, and dispatches disjoint groups in parallel. Nothing found does this before dispatch.
2. **Routing by agent kind** over a pool of *user-opened* Claude and Codex sessions, each of which claims work.
3. **Decision points**: a design-variation pick (Agent HQ's "compare agents" is the nearest relative), send-back-for-revision, and approve → a merge task.
4. **Test-box capacity**: RAM-aware limits on concurrent preview environments. No prior art found.
5. **Dashboard flow view** in `orca serve`: read-only plus steering links. Its data comes from GitHub and the worker sessions.

---

## 3. Subscription constraints

**Summary:** The documented rules permit what the factory needs, provided each worker is the unmodified CLI under the user's own login. "The user opens each worker" is the most conservative way to stay inside "ordinary, individual usage", but no rule requires it. Throughput is bounded by usage windows: N workers burn quota about N times as fast. The two Anthropic pages differ in emphasis on the SDK; flag that ambiguity.

### Anthropic (Claude Pro/Max)

What the docs say:
- **Consumer Terms** (effective 2025-10-08) prohibit accessing the Services "through automated or non-human means, whether through a bot, script, or otherwise", *except via an API key or where Anthropic explicitly permits it*. Sharing credentials is also prohibited.
- **Legal & compliance page** (code.claude.com, read 2026-10-23):
  - OAuth is "designed to support ordinary use of Claude Code and other native Anthropic applications".
  - Developers building products on the Agent SDK "should use API key authentication".
  - Third parties may not offer Claude.ai login or route requests through Free/Pro/Max credentials "on behalf of their users", and may not "collect, store, or intermediate" credentials or session tokens.
  - It "does [not] prevent an end user from signing in to the unmodified Claude Code binary with their own Claude subscription."
  - "Advertised usage limits for Pro and Max plans assume ordinary, individual usage of Claude Code and the Agent SDK."
  - "Anthropic reserves the right to take measures to enforce these restrictions … without prior notice."
- **Support article "Use the Claude Agent SDK with your Claude plan"**:
  - The 2026-06-15 update says the planned separate SDK credit was *paused*; "nothing has changed".
  - The 2026-10-07 update says Max and Team plans now include monthly API credits covering the Agent SDK, `claude -p`, the API and Managed Agents, and that you "can still use the Claude Agent SDK, claude -p, and third-party apps with your subscription limits".
  - Credit amounts aren't stated on the page. Earlier reports of $20/$100/$200 for the paused plan are 2nd-hand.
  - It says nothing on concurrency or continuous running.

What this means for orca:
- **Anthropic explicitly provides these for long-running and looping use**: background sessions and a supervisor (agent view: "Sessions survive … machine sleep"), `/loop`, the Monitor tool, channels ("for an always-on setup you run Claude in a background process or persistent terminal"), Remote Control server mode (`--capacity`, default 32), and `claude -p` workers receiving messages.
- **Hard technical limits**: Remote Control, `/schedule` and Projects need a full claude.ai login, not `setup-token` (`CLAUDE_CODE_OAUTH_TOKEN` "can only make model requests"). `--bare` mode ignores OAuth and needs an API key. Agent teams don't spawn in `-p` or SDK mode.
- **Usage limits**: a 5-hour window and a weekly window, shared with chat. Each session, background session, teammate and `/loop` fire draws on them. An idle session waiting for work costs nothing, but a polling `/loop` re-sends its context on every fire, so prefer Monitor or channels for waking. Overage only with usage credits turned on.
- **History, 2nd-hand (TechCrunch, 2025-07-28)**: Anthropic introduced weekly limits citing users running Claude Code "continuously in the background, 24/7" and account sharing or reselling. The response was rate limits, not bans, but it shows where the line is watched. Server-side blocking of *third-party clients* using Pro/Max OAuth reportedly finished around 2026-04-04 (2nd-hand). It targeted tools like OpenCode, not the real `claude` binary.

The grey zone, and how to stay safe:
- **Grey zone**: a homemade daemon that starts many `claude -p` processes around the clock under one subscription. It is permitted by the support article but strains "ordinary, individual usage".
- **Safe pattern**: the user starts each worker (an orca terminal running interactive `claude`, or `claude --bg`). Workers wait cheaply, at most a few per subscription, and every engineer uses their own login. Don't read `~/.claude` tokens from orca code, and don't proxy model traffic.

### OpenAI (Codex with a ChatGPT plan)

- **Auth docs** (learn.chatgpt.com, read 2026-10-23):
  - The CLI, IDE and app accept ChatGPT sign-in or an API key; Codex cloud *requires* ChatGPT sign-in.
  - Headless use: device-code login (beta), or copy `~/.codex/auth.json` ("treat … like a password").
  - "API keys are still the recommended default for automation." "Use API key authentication for programmatic Codex CLI workflows, such as CI/CD jobs."
  - Enterprise admins can issue Codex access tokens "for trusted scripts, schedulers, and private CI runners".
- Recommended, but not prohibited: interactive or queued sessions under ChatGPT sign-in are the documented local use. `codex queue` and `codex remote-control` are first-party ways to feed and steer existing sessions.
- **"Sign in with ChatGPT" / plan usage in third-party tools**: OpenAI reportedly lets partner apps (Amp, Devin, …) draw on a user's plan allowance, and documents how an app runs `codex app-server` with a user's ChatGPT OAuth token. That makes OpenAI more permissive than Anthropic toward third-party clients (2nd-hand; partner list and eligibility **[unverified]**).
- OpenAI's Terms of Use clause on "automatically or programmatically extract[ing] … Output" **[unverified: the page returned 403; this is from memory]**.
- **Limits**: a 5-hour window plus a weekly window. The Plus 5-hour cap was removed in July 2026 and restored from 2026-08-25, with Pro exempt "for the upcoming months" (2nd-hand).

---

## 4. Standards

**Summary:** Adopt AGENTS.md, Agent Skills and MCP. They are cheap, shared by Claude and Codex, and already the direction orca is going. Read Symphony's SPEC.md for issue-tracker conventions. Skip A2A and MCP Tasks for now.

- **AGENTS.md**: orca already treats it as canonical. It's now one of the founding projects of the Linux Foundation's **Agentic AI Foundation** (announced 2025-12-09, alongside MCP and goose).
- **Agent Skills (SKILL.md, agentskills.io)**: published as an open standard in December 2025 and supported by Claude Code, Codex, Copilot, Cursor and others (2nd-hand count: 30+). Worker roles ("planner", "worker", "lander") as skills give one definition for both agent types and fit P8 (load on demand). The same move is already open in orca's landscape-2026-10.md.
- **MCP**: one small queue server (list ready / claim / report / ask human) that both Claude and Codex can call. Claude channels are MCP servers, so the same server could also *push* "work ready" into idle Claude workers.
  - Note: Claude Code doesn't register a channel server that negotiates MCP revision 2026-07-28 (channels doc).
  - MCP **Tasks** (async long-running calls) moved to an extension and was redesigned in the 2026-07-28 revision (2nd-hand). Not needed here.
- **A2A** (Apache-2.0, 26k★): for opaque agents talking across a network. Overkill for workers in one container. Revisit only if the factory federates across machines or teams.
- **Symphony SPEC.md**: not a standard, but a public spec for "tracker → isolated run → proof of work → land". Worth borrowing its vocabulary and state model instead of inventing one.

---

## Sources

Anthropic, read 2026-10-23:
- https://code.claude.com/docs/en/legal-and-compliance
- https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan
- https://www.anthropic.com/legal/consumer-terms
- https://code.claude.com/docs/en/agents
- https://code.claude.com/docs/en/claude-projects
- https://code.claude.com/docs/en/agent-view
- https://code.claude.com/docs/en/agent-teams
- https://code.claude.com/docs/en/cross-session-messaging
- https://code.claude.com/docs/en/channels
- https://code.claude.com/docs/en/remote-control
- https://code.claude.com/docs/en/scheduled-tasks
- https://code.claude.com/docs/en/routines
- https://code.claude.com/docs/en/headless
- https://code.claude.com/docs/en/costs
- https://code.claude.com/docs/en/github-actions

OpenAI:
- https://learn.chatgpt.com/docs/auth (redirect from developers.openai.com/codex/auth)
- https://learn.chatgpt.com/docs/developer-commands?surface=cli
- https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server
- https://github.com/openai/codex
- https://github.com/openai/symphony
- https://www.helpnetsecurity.com/2026/04/28/openai-symphony-codex-orchestration-linear/
- https://codex.danielvaughan.com/2026/10/08/openai-devday-2026-recap-codex-cloud-agents-view-gpt61-sol-code-review-security-cloud/ (2nd-hand)
- https://thenewstack.io/sign-in-with-chatgpt/ (2nd-hand)
- https://www.ithinkdiff.com/openai-codex-five-hour-limit/ (2nd-hand)
- https://propakistani.pk/2026/07/14/openai-removes-5-hour-limit-for-chatgpt-work-and-codex-users/ (2nd-hand)

Third-party tools (READMEs and stats via the GitHub API, 2026-10-23):
- github.com/OrchestratorInc/agent-orchestrator
- github.com/gastownhall/gastown
- github.com/gastownhall/beads
- github.com/superset-sh/superset
- github.com/BloopAI/vibe-kanban
- github.com/humanlayer/humanlayer
- github.com/smtg-ai/claude-squad
- github.com/stravu/crystal
- github.com/imbue-ai/sculptor
- github.com/terragon-labs/terragon-oss
- github.com/herdrdev/herdr
- github.com/MrLesk/Backlog.md
- github.com/OpenHands/OpenHands
- https://www.conductor.build
- https://korben.info/en/conductor-run-ai-agents-parallel-codebase.html
- https://www.i-programmer.info/news/105-artificial-intelligence/18651-github-adds-claude-and-codex-to-agent-hq.html (Agent HQ, 2nd-hand)
- https://techsy.io/en/blog/background-coding-agents-compared (Devin/Factory/Cursor pricing, 2nd-hand, April 2026)

Policy history:
- https://techcrunch.com/2025/07/28/anthropic-unveils-new-rate-limits-to-curb-claude-code-power-users/
- https://winbuzzer.com/2026/02/19/anthropic-bans-claude-subscription-oauth-in-third-party-apps-xcxwbn/ (2nd-hand)
- https://news.creeta.com/en/claude-code-oauth-block-2026-third-party-tools/ (2nd-hand)

Standards:
- https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation
- https://codex.danielvaughan.com/2026/05/05/agent-skills-open-standard-portable-skills-codex-cli-cross-agent/ (2nd-hand)
- https://workos.com/blog/mcp-async-tasks-ai-agent-workflows (2nd-hand)
- github.com/a2aproject/A2A
- github.com/agentsmd/agents.md
