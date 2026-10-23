# Software factory: the work loop

Research for the design, 2026-10-23. Docs checked: code.claude.com/docs (Claude Code 2.1.307 is in the
image) and learn.chatgpt.com/docs (where developers.openai.com/codex now redirects). Anything marked
**[unverified]** comes from secondary sources or my own inference, not from a primary doc.

## Top layer

1. **Queue = one plain file per task and per group, in a folder of the project (`.factory/`), with an append-only `events.jsonl`.** All writes go through a small `factory` CLI that takes a lock. No server is needed for correctness. The Mac reads the same folder through the mount.
2. **Workers claim *groups*, not tasks.** A single task is a group of one. A claim is a lease with a heartbeat, made atomic with `flock` or an `O_EXCL` lock file. For claims across machines later, use `git push` of a ref that must not already exist.
3. **One grouper (a planner role) groups tasks when they arrive, after a short quiet period.** It predicts the files and modules each task touches, links tasks that share files, decisions or dependencies, and splits the linked sets into sequential stages. Workers don't negotiate. While branches are in flight, check them pairwise with `git merge-tree`.
4. **Claude worker = a session the user opens, running a `factory wait` script under the `Monitor` tool.** Each event wakes it with a turn, and there's no polling. Fallback: a self-paced `/loop`. Push upgrade: a custom **channel** MCP server (research preview, needs a dev flag).
5. **Codex worker = a session the user opens, woken by `codex queue --thread <id> --message …`.** Alternative: the TUI attached to a `codex app-server` that the factory also drives (`turn/start`, `turn/steer`). Both are newer and less proven. Test them first.
6. **Keep each worker's context clean by doing each group in a fresh subagent with worktree isolation.** The session the user opened stays a thin dispatcher. It's the dispatcher the user talks to and steers.
7. **Isolation: a git worktree per group inside the project's container, with a port block and a database name per worker.** Merging is its own task, done one at a time by a merge worker: rebase, re-run checks, land (or use GitHub's merge queue).
8. **Notifications come from the Mac, not the containers.** A blocker is a question file. `orca serve` sees it and pushes to the phone (ntfy or similar). Answers go back as files the waiting worker's monitor picks up. Steering goes the same way, or directly in the worker's tmux terminal or through Remote Control.

---

## 1. The queue and its states

**Summary.** Plain files under the project folder, written only through a `factory` CLI or MCP shim that locks. You can read them with `cat` and diff them with `git`. Both the Mac dashboard (through the mount) and every worker in the container can see them, and nothing has to run for the state to be correct. **Recommended:** `.factory/tasks/<id>.md` (YAML front matter plus body), `.factory/groups/<id>.json`, `.factory/events.jsonl`, `.factory/questions/<id>.md`.

### Where tasks live (compared)

| Option | For | Against |
|---|---|---|
| **Files in the project folder, CLI-mediated (recommended)** | Inspectable, greppable, no daemon, the Mac sees them via the mount, survives container recreation (`/workspace` persists) | Needs a lock discipline; history only as good as the event log |
| Same, committed to git on the main branch | Free history, shareable with other engineers | Claims and state churn create commits and conflicts across worktrees and branches. Keep state *out* of code branches: use a separate orphan branch or repo, or keep `.factory/` untracked and export a snapshot |
| SQLite | Real transactions, easy queries | Opaque to `cat` and diffs. Fine as a later cache or index |
| [Beads](https://github.com/steveyegge/beads) (`bd`) | Already built for agents: `bd ready`, atomic `bd update --claim`, dependency graph, hash IDs | Now stores in Dolt (`.beads/embeddeddolt/`, single writer). JSONL is only an export, so it's less plain than it looks. A good model to copy, or an optional backend |
| GitHub Issues/Projects | Visible to the team, phone app, mentions | Network round trips, rate limits, credentials in untrusted containers; a poor fit for leases. Better as a **sync target** later (mirror groups and reviews as issues/PRs) |
| Claude Code agent-teams task list | Built in: file-locked claims, dependencies | Scoped to one lead session (`~/.claude/tasks/{team}`), Claude-only, experimental, no resume. Not a shared queue |

### Lifecycle

Task: `draft → ready → grouped → done | cancelled`. The task's own lifecycle stays short. The work state lives on the **group**:

`proposed → claimable → claimed → working ⇄ blocked → review → (revise → working) → approved → merging → done`, plus `failed`, `abandoned`.

- `draft → ready` happens only in the main chat, or when the user says so. The grouper only sees `ready`.
- `review → revise` keeps the **affinity** to the same worker, since its subagent's transcript or branch holds the context. The lease is released, but the same worker gets first pick for N minutes.
- `approved` creates a new group of kind `merge`, which only a merge worker can claim.
- Variations: a task with `variations: 3` becomes three sibling groups with `variant_of`, each on its own branch. Review picks one, and the others become `abandoned`.

### Claiming without double-taking

- **Single machine (now):** `factory claim --worker W --kind claude` takes `flock(.factory/lock)`, picks the best claimable group whose `requires` matches, and writes `claim: {worker, lease_until, heartbeat_at}` plus an event. A heartbeat every 1–2 minutes moves `lease_until` forward (the worker's monitor script can send it, so this costs no tokens). An expired lease makes the group claimable again, but first check whether its branch has commits and hand it back with `resume_from: <branch>`.
- **Across machines (later):** `git push origin <sha>:refs/factory/claims/<group>` without `--force`. The ref already existing means someone else won. Release by deleting the ref. The lease time goes in the ref's commit message. **[unverified as practice; standard git ref semantics]**
- Fencing: every write a worker makes carries its `claim_id`, and the CLI rejects writes from a lease that expired or changed hands. This stops a "zombie worker" from writing.

### Task record (minimum)

```yaml
id: t-7f3a            # hash id, collision-free across branches
title: Add CSV export to reports
status: ready
requires: any         # claude | codex | any
variations: 1
repo: app             # which repo in a multi-repo project
base: main
depends_on: [t-11c2]
decisions: [d-auth-session]   # shared design decisions this task relies on
touches_predicted: [src/reports/**, api/reports.ts]   # written by the grouper
env: {services: [postgres], seed: demo, ports: 2, preview: true}
acceptance: |         # what "done" looks like; evidence must show it
  ...
created_by: main-chat
```

Group: `id, tasks[], kind (work|merge), requires, stage/order, status, claim, branch, worktree, evidence[] (test logs, screenshots, preview URL), questions[], review {verdict, notes}, variant_of`.

---

## 2. Grouping related work

**Summary.** One grouper decides. It's an agent role, triggered when new `ready` tasks arrive and have been quiet for a short window (for example 2 minutes), so a burst becomes one decision. It builds a conflict graph from predicted touch sets, dependencies and shared decisions. Linked sets become groups, ordered into stages; disjoint groups run in parallel. **Recommended:** grouper as a planner agent, plus cheap deterministic checks (`git merge-tree`, co-change history) that the factory CLI runs.

### How it decides

1. **Predict touches.** The grouper reads each task and the repo map: code search, the import graph, a module map such as package boundaries or CODEOWNERS, and **co-change history** (`git log --name-only`: files that historically change together). It writes `touches_predicted` as globs at module granularity. Over-predicting is safe: it only lowers parallelism.
2. **Build edges.** Tasks get an edge when they share a predicted file or module, when one depends on the other, when they share a decision id, or when both change a shared contract (schema, public API, lockfile, migrations directory).
3. **Form groups.** Connected components become candidate groups. A component that's too large is split along dependencies into **stages**: same group, done in order by one worker, or later stages queued behind earlier ones. Size limit: about what one worker can finish and get reviewed in a sitting.
4. **Parallelise.** Components with no edge between them go to different workers. `requires` partitions them further: a group needing Codex is only offered to Codex workers.
5. **Verify while running.** When a group reaches `review`, the factory runs `git merge-tree --write-tree` against each other in-flight branch and against `main`. A real textual conflict marks the pair `serialize` and tells both workers. Semantic conflicts still need tests (Braidkeep-style mergeability prediction catches only textual ones).

### New tasks arriving

- If the new task overlaps a **claimable** group, regroup freely.
- If it overlaps a **claimed** group, don't change that group underneath the worker. Either append it as a follow-up stage offered to the same worker next (affinity), or set `blocked_by: <group>`. The grouper picks one and writes its reason.
- A worker may **split or decline** a group with a reason. That goes back to the grouper, so workers never negotiate with each other.

### Who groups

| Option | Verdict |
|---|---|
| **Grouping agent on arrival (recommended)** | One consistent view, cheap, auditable (reasons written to the group file). It can be the Claude or Codex planner the user opened, with a role prompt |
| Workers negotiate (claim, then announce file reservations, like mcp_agent_mail) | More chatter, races, and tokens. Advisory reservations still conflict. Keep only as a backstop: workers record `touches_actual` |
| Pure static (files only, no agent) | Misses shared design decisions; fine as a pre-filter |

### Prior art

- Cassandra (Kasi & Sarma, ICSE 2013): turns predicted conflicts into constraints and solves for a conflict-minimal task schedule. It avoided most conflicts in four OSS projects, which saw conflicts in 34–54% of merges. That's the grouper's job, done by a solver.
- Crystal (Brun et al., 2011) and Palantír (Sarma et al.): proactive conflict detection by speculatively merging in-flight work. Same idea as the `merge-tree` check. **[from memory]**
- arXiv 2607.04697 (Jul 2026): 33,596 agent PRs. Concurrent agent PRs are the norm (about 79% of agent PRs fall in overlapping pairs), measured by replayed three-way merges.
- CooperBench (Jan 2026): reports about a 30% success drop when two agents collaborate versus one alone. AgenticFlict reports about a 28% conflict rate in agent PRs. **[secondary sources, unverified]** Both argue for fewer, larger, file-disjoint groups over finer splitting.
- Claude Code agent-teams guidance: "Two teammates editing the same file leads to overwrites. Break the work so each teammate owns a different set of files"; 5–6 tasks per teammate.
- OpenAI Symphony (already in `orca-context/designs/parallel-agents-research.md`): per-state concurrency and a land skill that merges one at a time.

---

## 3. Workers that watch for work, under a subscription

**Summary.** Waiting while idle must cost no tokens, and a wake must cost one turn. In Claude Code that's the `Monitor` tool on a blocking `factory wait` script. In Codex it's `codex queue` or the app server pushing a message in. Each group runs in a fresh subagent so the long-lived session stays small. **Recommended:** the user opens a session, types `/factory-worker claude` (a skill), and the skill sets up the monitor and the claim, dispatch and report loop.

### Claude Code mechanisms (checked against current docs)

| Mechanism | How it serves a worker | Limits / cost |
|---|---|---|
| **`Monitor` tool (recommended)** | Claude runs `factory wait --kind claude --worker W` in the background. Each stdout line (`group g-12 claimable`, `answer q-3`, `steer: …`) reaches Claude as an event, mid-conversation or as a new turn | Each watch has a deadline (default 5 min, **max 30 min**). At the deadline Claude gets one notice and re-arms, so an idle worker costs about 2 small turns an hour. Not available with `DISABLE_TELEMETRY` or `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`. Uses Bash permission rules. **Plugin monitors** can start automatically when a plugin is active |
| Self-paced `/loop` (fallback) | `/loop check the factory queue and take claimable work` wakes on a delay Claude picks (1 min–1 h) via `ScheduleWakeup`. `.claude/loop.md` can hold the worker prompt | One turn per wake even when there's nothing to do. 7-day expiry. Not restored on `--resume`. Fires only while the session is open and idle. Docs say Monitor is "often more token-efficient" |
| **Channels** (push) | Custom MCP server declaring `claude/channel` emits `notifications/claude/channel`, arriving as `<channel source="factory" group="g-12">…`. Events queue and are delivered in order, and they start a turn. Two-way with a reply tool. **Permission relay** forwards tool approvals | Research preview. Custom servers need `--dangerously-load-development-channels server:factory`, which shows a confirmation dialog at each start and is ignored with `-p`. Pro/Max: available without admin. Under the v2 MCP runtime, set `MCP_PROTOCOL_NEGOTIATION=legacy` or the channel won't register. Stdio only |
| MCP long-poll tool `wait_for_work(timeout)` | Portable across Claude and Codex. A call still running after 2 minutes moves to a background task, and its result arrives as a task notification | Stdio idle timeout 30 min unless the server sends progress. **Whether the late result starts a turn in an idle session is [unverified]** |
| Cross-session messaging (`SendMessage`, `ListAgents`) | The main chat agent can tell `@worker-claude-1` things directly. An idle session gets a new turn. A script can post to `$CLAUDE_CODE_MESSAGING_SOCKET`. A `notify_when_idle` subscription tells the main chat when a worker finishes | **Blocked in orca today:** `image/managed-settings.json` sets `crossSessionInbound: "refuse"`, a managed setting projects can't override. Same container only (each container counts as its own machine). Messages from bypass-mode senders are *held* for approval unless `accept` is set. Rate-limited, and loops are throttled |
| Stop hook / `/goal` | Chains the next group without idling: a Stop hook that finds claimable work returns `decision: block` with the brief. `/goal no claimable groups remain for claude workers` drains a burst | Neither wakes an idle session. A Stop hook firing every turn is easy to get wrong; prefer the monitor |
| Background sessions (`claude --bg`, agent view) / Remote Control server mode `--spawn worktree` | Fresh session per group, its own worktree, survives terminal close (supervisor). `claude agents --json` gives state for the dashboard | These spawn sessions programmatically. The user wants to open each session themselves (subscription terms), so treat this as optional and the user's call. **[ToS reading unverified]** |
| Agent teams | Shared task list with file-locked claims, `TeammateIdle` / `TaskCompleted` hooks | Experimental, one team per session, Claude-only, no resume of in-process teammates. Usable *inside* one worker, not as the factory |

**Keeping context clean.** A model can't run `/clear` or `/compact` itself (built-in commands sent as prompts stay plain text). So the worker session acts as a **dispatcher**: claim, then spawn a named subagent with `isolation: worktree` and the group brief (task files, decisions, acceptance, env), then relay its questions and record its evidence. The subagent's whole transcript stays out of the dispatcher, which receives only the summary. Notes:
- Subagents get a 5-minute cache TTL, versus 1 hour for the main conversation on a subscription. Set `subagentPromptCacheTtl: "1h"` if groups wait on answers.
- Revisions resume the same named subagent (`SendMessage` to it), which keeps its context and warm cache.
- Alternative for long or heavy groups: the user restarts the worker session every N groups. A wakeup costs little with the 1-hour main-conversation cache on a subscription, and idle compaction kicks in before the cache expires.

### Codex CLI mechanisms

| Mechanism | Notes |
|---|---|
| **`codex queue --thread <id|name> --message "…"` (recommended to test first)** | Queues text for an existing session. Also takes `--remote`. Whether it starts a turn at once in an idle TUI, and whether a plain TUI session (not on the "managed background server" / `/daemon`) is reachable, are **[unverified: test]** |
| `codex app-server --listen unix:///…sock` + `codex --remote unix:///…sock` | The user's TUI and the factory are both clients of one app server. Factory calls: `turn/start` on an idle thread (wake), `turn/steer` (append to the running turn, needs `expectedTurnId`), `thread/inject_items` (add context without a turn); it listens for `turn/completed` and `thread/status/changed`. Approvals arrive as server requests (`item/commandExecution/requestApproval`) and could be relayed to the phone. "Experimental… not supported for production"; non-loopback WS is unauthenticated by default, so keep it on a unix socket. Several clients on one thread is implied by per-connection subscriptions but **[unverified]** |
| Hooks (`.codex/hooks.json`) | `Stop` with `decision: "block"` creates a continuation prompt from `reason`, so it can chain the next group. "Finishing a background hook doesn't start a new turn": no idle wake from hooks |
| `notify = [...]` (`agent-turn-complete`, JSON with `thread-id`, `last-assistant-message`) | Lets the factory see a Codex worker go idle or finish, for heartbeats and status, at no token cost |
| MCP client (`[mcp_servers.factory]`) | Long-poll tool needs `tool_timeout_sec` raised from its default of 60; the maximum is **[unverified]**. Codex handling MCP push notifications is undocumented, so no channel equivalent |
| `/goal`, subagents (`[agents]`, `max_concurrent_threads_per_session`) | Same dispatcher pattern: a fresh subagent thread per group. Codex subagents have no worktree option, so the dispatcher makes the worktree itself |
| `codex exec resume <id>` | Programmatic; same subscription-terms question as `claude --bg` |
| Removed | `codex mcp-server` is gone (replaced by app-server). Plan nothing on it |

### Roles a user opens

`planner/grouper` (Claude and/or Codex; also the main chat, or separate), `worker-claude-N`, `worker-codex-N`, `merge` (either kind). Each is one skill or prompt: `/factory <role>`. Session names (`--name`, `/rename`) let the main chat mention them and the dashboard label them. `CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX` is already set by orca.

---

## 4. Isolation for parallel work

**Summary.** Use a git worktree per group inside the project's one container: cheap, and it shares the home, logins and network. Give each worker an offset port block and its own database name. Merging is a separate serial task. **Recommended:** worktrees under `.factory/worktrees/<group>`, or Claude's default `.claude/worktrees/`, with `.worktreeinclude` for env files; a `merge` worker that lands one group at a time.

| Option | For | Against |
|---|---|---|
| **Worktree per group (recommended)** | Fast, one `.git`, Claude and Codex both support it (`--worktree`, `isolation: worktree`, `/worktree`), `WorktreeCreate` hook to customise | Per-worktree dependency install (no shared `node_modules` volume; see `node-modules-volume.md`); shared Docker network, so ports must be partitioned |
| Separate clone per worker | Full independence (hooks, submodules, sparse checkout) | Disk and fetch cost; little gain inside one container |
| Separate container per worker | Real resource and trust isolation, its own ports and DB | Orca has one container per project; this needs a new "worker container" kind sharing the project home, so it's heavier. Worth it later for untrusted or heavy environments |

**Per-worker environment.** Give each worker `FACTORY_SLOT=n` and set `PORT=3000+10n` and `DB_NAME=app_w$n` (or a SQLite file per worktree). A preview URL goes through orca's forwards proxy as `<group>.<project>` → slot port, so review gets a **live environment** per group. If the app needs compose services, use a compose project name per slot. **[whether the container can run Docker: check]**

**Making merges safe.**
1. `approved` creates a `merge` group that only the merge worker claims, one at a time per repo (per-state concurrency of 1, as in Symphony).
2. Merge worker: fetch, rebase onto `main` (or merge main in), run the project's checks in the worktree, push, open or update the PR, wait for CI.
3. Land with GitHub's merge queue (`merge_group` event, checks run on the queued combination) when the repo has CI. Otherwise land locally with fast-forward only after the rebased branch passes.
4. Before landing, run `git merge-tree --write-tree` against the other `review` and `approved` branches. Tell the owners of any that will now conflict, and rebase them in the order the dependency graph gives.
5. Conflicts the merge worker can't resolve trivially become a `revise` on the original group (same worker affinity), not a guess.
6. Agents never push to `main` (matches orca's Git rules and Claude background sessions' own default).

---

## 5. Blockers, pings and steering

**Summary.** A blocker is a file: a question with options, written by `factory ask`, which sets the group to `blocked`. The Mac (`orca serve`) watches the folder and sends the push, so no push credential lives in an untrusted container. The answer is a file too. The waiting worker's monitor gets it as an event and carries on. Steering uses the same inbox, or the worker's terminal directly. **Recommended:** questions and answers as files, a Mac-side notifier (ntfy, or Pushover / Telegram), and the dashboard plus main chat as the two answer surfaces.

### Raising and waiting

- Worker (or its subagent, via the dispatcher) runs `factory ask --group g-12 --question "…" --option A --option B --blocking`. That writes `.factory/questions/q-3.md` and moves the group to `blocked`. The heartbeat continues, so the lease isn't lost.
- While waiting, the worker keeps `Monitor` on `factory wait --answer q-3`, which costs no tokens. If the answer takes longer than X, it can *park* the group (release the lease, keep affinity) and take another group that doesn't conflict.
- "Genuine" blockers: the skill prompt asks for a question only when the work can't go on safely (a product decision, a credential, an irreversible action, a contradiction in acceptance). Anything else becomes an assumption recorded in the evidence for review. That's P2-style trust-and-correct, not a rule table.

### Notification channels

| Channel | Fit |
|---|---|
| **ntfy (recommended start)** | `curl -d … ntfy.sh/<secret-topic>` or self-hosted. Up to 3 action buttons, and an `http` action can POST to a URL. Point the buttons at the **dashboard** (with its token), never at the container. Sent by the Mac |
| Claude `PushNotification` tool | Desktop notification, plus a phone push through the Claude app when Remote Control is connected. Zero setup for Claude workers, but the container decides what gets sent and it covers only Claude |
| Remote Control (Claude app) | Open the worker's own session on the phone and answer in place. Push when it needs input. Pro/Max OK, no API keys. Transcript stored by Anthropic |
| Telegram/Discord channel plugin | Two-way chat into one session, plus permission relay (`yes abcde`). Per session, so it suits the main chat more than every worker |
| Codex | `notify` program or `tui.notifications` (`approval-requested`). Codex mobile needs the ChatGPT desktop app as host (macOS/Windows), so a container CLI is **[not covered by docs]**. Use the factory notifier |
| GitHub mentions / PR comments | Good for review and merge stages when PRs exist. Slower for blockers |

### How the answer reaches the worker

1. **Dashboard**: the user answers, and `orca serve` writes `.factory/questions/q-3.answer.md` plus an event. The worker's monitor fires.
2. **Main chat**: the user tells the main agent, which runs `factory answer q-3 "…"`. Same file, same event. (Cross-session `SendMessage` would be the direct way, but it's refused under orca's current managed settings.)
3. **Directly**: attach to the worker's tmux terminal (`orca start --terminal worker-claude-1`), or open it with Remote Control and type. For Codex, type in the TUI, or `codex queue` / `turn/steer`.
4. **Tool approvals** (not questions): channel permission relay, or Remote Control. Better: run workers in auto mode or with an allowlist so approvals are rare.

**Steering a running worker.** `factory steer g-12 "use the existing CSV helper"` appends to `.factory/groups/g-12.inbox`. Monitor events arrive mid-turn ("Claude interjects when an event arrives"). The dispatcher forwards them to the subagent with `SendMessage`. For Codex, use `turn/steer` (app-server) or `codex queue`. A steer note is user intent; the worker treats it like a typed message, but it is recorded so review sees it.

### Security (containers are untrusted)

- **Notifications leave from the Mac**, built from fields the Mac validates, so the container never holds the ntfy, Pushover or Telegram secret. Treat question text as untrusted on display: render it as plain text, cut it to length, and add a fixed label, so a container can't send a convincing "tap to approve" phishing message with a link of its own.
- **Answer and steer paths write only into that project's `.factory/`**, through dashboard endpoints behind the existing token, cross-site and DNS-rebinding checks. Nothing from `.factory/` is ever run on the Mac, and the dashboard only parses it as data.
- **Action buttons point to the dashboard**, never to a container port. Reaching the dashboard from the phone is a separate open question (it listens on loopback today).
- **Channel permission relay** gives approval power to anyone on the channel's allowlist. Allowlist only the user.
- **Cross-session messaging**: if orca relaxes `crossSessionInbound` for factory projects, set it to `accept` per project (an orca setting that writes managed settings), not globally. Keep `isolatePeerMachines: true` so nothing leaves the container's machine without approval.
- **Leases and fencing** keep a misbehaving worker from overwriting another's group. The CLI also checks that a worker writes only its own group's files. This is advisory inside one container: anything there can edit files, so the Mac side treats `.factory/` state as claims, not proof. Evidence is re-checked in review.

---

## Sources

- Claude Code docs index: https://code.claude.com/docs/llms.txt
- Scheduled tasks / `/loop` / `ScheduleWakeup`: https://code.claude.com/docs/en/scheduled-tasks.md
- Tools reference (Monitor, PushNotification, SendMessage, background Bash): https://code.claude.com/docs/en/tools-reference.md
- Channels: https://code.claude.com/docs/en/channels.md
- Channels reference (custom server, permission relay): https://code.claude.com/docs/en/channels-reference.md
- Cross-session messaging: https://code.claude.com/docs/en/cross-session-messaging.md
- Remote Control: https://code.claude.com/docs/en/remote-control.md
- Agent view / background sessions: https://code.claude.com/docs/en/agent-view.md
- Agent teams: https://code.claude.com/docs/en/agent-teams.md
- Hooks reference: https://code.claude.com/docs/en/hooks.md
- `/goal`: https://code.claude.com/docs/en/goal.md
- MCP (timeouts, auto-backgrounding, channels on v2 runtime): https://code.claude.com/docs/en/mcp.md
- Prompt caching (1h main TTL on subscription, subagent TTL): https://code.claude.com/docs/en/prompt-caching.md
- Codex docs index: https://learn.chatgpt.com/docs/llms.txt
- Codex CLI commands (`codex queue`, `--remote`, `/daemon`, `/goal`): https://learn.chatgpt.com/docs/developer-commands.md?surface=cli
- Codex App Server: https://learn.chatgpt.com/docs/app-server.md
- Codex MCP server removal: https://learn.chatgpt.com/docs/mcp-server.md
- Codex hooks: https://learn.chatgpt.com/docs/hooks.md
- Codex advanced config (`notify`, `tui.notifications`): https://learn.chatgpt.com/docs/config-file/config-advanced.md
- Codex MCP config (`tool_timeout_sec`): https://learn.chatgpt.com/docs/extend/mcp.md
- Codex non-interactive (`codex exec resume`): https://learn.chatgpt.com/docs/non-interactive-mode.md
- Codex subagents: https://learn.chatgpt.com/docs/agent-configuration/subagents.md
- Codex remote connections / mobile: https://learn.chatgpt.com/docs/remote-connections.md
- Beads: https://github.com/steveyegge/beads
- mcp_agent_mail (file reservations; third-party listing): https://glama.ai/mcp/servers/@Dicklesworthstone/mcp_agent_mail/tree/caf48261b892b2a2071f9f59a119152b70b91ffb
- ntfy publishing / action buttons: https://docs.ntfy.sh/publish/
- Cassandra (Kasi & Sarma, ICSE 2013): https://web.engr.oregonstate.edu/~sarmaa/wp-content/uploads/2020/08/2486788.2486884.pdf
- Agent PR merge conflicts (arXiv 2607.04697): https://arxiv.org/abs/2607.04697
- Secondary summary of AgenticFlict / CooperBench [unverified]: https://codex.danielvaughan.com/2026/07/28/agent-pr-merge-conflicts-concurrent-coding-agents-codex-cli-worktree-isolation-coordination-defence/
- Braidkeep (merge-tree conflict prediction): https://www.hunted.space/dashboard/braidkeep
- Orca repo context: `/workspace/image/managed-settings.json` (`crossSessionInbound: refuse`), `/workspace/container-features.md`, `/workspace/orca-context/designs/parallel-agents-research.md`
