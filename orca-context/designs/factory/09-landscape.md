# 9. What exists, and subscriptions

**Summary.** Most pieces exist somewhere; the gaps are grouping work before handing it out, a pool of
Claude and Codex sessions you open, test-box capacity, and picking between variations. Under a
subscription, the unmodified `claude` and `codex` CLIs signed in as you are fine for this, including
long-running and looping sessions; your quota is the real limit.

## Closest existing tools

**Summary.** Claude Projects (first-party) and Orchestrator.inc (open source) cover the most.

- **Claude Projects** (beta, Pro/Max): a planning conversation starts parallel threads, shows what
  needs you, and has Fix CI and Merge buttons on PRs. Threads can run on your machine through Remote
  Control, so an orca container could host them. Claude only, no grouping (limits are preferences),
  no previews, single user; local threads are blocked while "Require trusted devices" is on, which
  conflicts with our earlier passkey advice.
- **Orchestrator.inc** (Apache-2.0): planning chat, Claude/Codex/20+ agents in worktrees, a kanban,
  an in-app preview, PR and CI state. Its app starts the workers itself.
- **Gas Town + Beads:** a dependency-aware queue with atomic claims and a merge queue that batches at
  merge time; heavy on invented vocabulary.
- Others (Superset, Conductor, claude-squad, HumanLayer, Agent HQ, Devin, Cursor) run parallel agents
  with review; Vibe Kanban and Terragon have shut down. Full table: `research/landscape.md`.

## Reuse rather than build

Agents' own waking, steering and notifications (Monitor, channels, `codex queue`, Remote Control);
orca's terminals and forwards; Playwright and ffmpeg for evidence; `gh` and GitHub's merge queue;
Agent Skills for roles (one definition for Claude and Codex); MCP if a queue server helps later.
Build: claiming, grouping, routing by kind, the review surface, capacity.

## Subscription terms

**Summary.** Opening each worker yourself is the conservative pattern, not a requirement.

- **Allowed:** the unmodified CLI under your own login, including background sessions, `/loop`,
  channels, Remote Control's multi-session mode, and (per Anthropic's 2026-10-07 support update)
  `claude -p` and the Agent SDK.
- **Not allowed:** offering Claude login inside your own app, routing other people's work through
  your plan, collecting or storing tokens, modifying the binary. Other engineers each use their own
  login.
- **Grey zone:** a home-made daemon running many `claude -p` processes around the clock; the terms
  assume "ordinary, individual usage".
- **The real limit:** 5-hour and weekly windows, shared with chat. N busy workers spend them about N
  times as fast; idle workers waiting under Monitor cost nothing.
- **Codex** with ChatGPT sign-in works for the CLI; OpenAI recommends API keys for automation but
  doesn't forbid the plan.
