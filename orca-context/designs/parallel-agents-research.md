# Parallel Agent Architecture Research

Research conducted March 2026 for Orca framework parallelization design.

## Problem Statement

Orca needs to support multiple agents working simultaneously on production codebases, with:
1. Blast-radius containment (agents run with `--dangerously-skip-permissions`)
2. No file conflicts between parallel agents
3. A safe, automated merge pipeline that works for production software

## Symphony (OpenAI) — Deep Analysis

Source: https://github.com/openai/symphony

Symphony is a long-running Elixir/OTP daemon that polls Linear for issues and dispatches isolated coding-agent sessions. Key architecture decisions:

### Workspace Isolation

**Full git clone per issue, not worktrees.** Each agent gets `git clone --depth 1` in its own directory under a configurable workspace root. No shared `.git` directory, no lock contention, no inter-agent interference. Workspaces persist across retries for the same issue but are cleaned up when issues reach terminal states.

### Orchestrator Simplicity

The orchestrator is deliberately dumb. It:
- Polls the tracker (Linear) for eligible issues
- Dispatches agents to available slots (max 10 concurrent, configurable)
- Retries on failure (exponential backoff: 10s, 20s, 40s... capped at 5min)
- Reconciles when external state changes (human moves a ticket)
- Never writes to the tracker — all ticket mutations are agent-driven

All workflow intelligence lives in the agent's prompt (WORKFLOW.md) and skills (markdown files in `.codex/skills/`).

### Merge Pipeline — The `land` Skill

Merging is **agent-driven, not orchestrator-driven**. The `land` skill is a markdown prompt the agent follows:

1. Locate the PR for the current branch
2. Confirm full CI is green locally before pushing
3. Check mergeability against main; if conflicts, run `pull` skill to resolve
4. Watch for automated review comments (Codex Review)
5. Watch CI checks via async Python watcher (`land_watch.py`)
6. If checks fail: pull logs, fix, commit, push, re-run
7. When all green: squash-merge using PR title/body

**Conflict resolution** is also a skill (`pull`): `git merge origin/main` with zdiff3 conflict style. Agent resolves conflicts autonomously unless they involve product intent, API contracts, or data loss.

**Per-state concurrency limits** prevent merge trains: `max_concurrent_agents_by_state` can limit e.g. max 2 agents in "Merging" state simultaneously. This is soft serialization without a formal merge queue.

### Configuration

Single file: `WORKFLOW.md` with YAML front matter (config) and markdown body (agent prompt). Version-controlled with the codebase. Dynamic reload without restart.

### Key Design Insight

Symphony separates **scheduling** (orchestrator) from **intelligence** (prompt + skills). The orchestrator manages lifecycle. The agent manages workflow. This avoids complexity explosion in orchestrator code.

---

## HumanLayer — Analysis

Source: https://github.com/humanlayer/humanlayer (Apache 2.0, YC F24)

### What It Is

An API/SDK for human-in-the-loop agent workflows. Two core primitives:
- `@hl.require_approval()` — decorator that gates function calls on human approval
- `hl.human_as_tool()` — lets agents ask humans freeform questions

Multi-channel: Slack (interactive buttons), email, desktop UI, CLI.

### Architecture

Works at the **tools layer** — framework-agnostic. Intercepts tool calls before execution, routes approval requests to configured channels, blocks until human responds, feeds denial reasons back to the agent.

Has evolved into **CodeLayer** — a desktop app for orchestrating Claude Code sessions with built-in MCP-based approval flows. Also has an **Agent Control Plane (ACP)** — Kubernetes-native orchestrator for long-lived agents (alpha).

### Relevance to Orca

**The intellectual framework matters more than the SDK:**
- 12-Factor Agents design principles (especially Factor 7: "Contact Humans with Tool Calls")
- Pattern of deterministic approval gates wrapping non-deterministic agent actions
- Outer-loop agent design (webhook-triggered, pause/resume)

**For Orca's specific needs, simpler alternatives work:**
- GitHub PR reviews + branch protection for merge gates
- Slack webhooks for "agent needs human input" notifications
- The SDK adds a cloud dependency and is over-engineered for narrow approval surfaces

### When HumanLayer Would Be Worth It

If Orca evolves to have agents performing many different high-risk actions (database mutations, API calls, deployments) where per-function approval routing matters. For code merge approval alone, it's overkill.

---

## Docker Isolation Patterns

### The Right Pattern: Orchestrator on Host, Agents in Containers

```
Host (orchestrator):
  Creates git clones/worktrees on host filesystem
  Spawns Docker containers per agent
  Monitors completion via `docker wait`
  Handles merge sequencing

Per-agent container:
  --dangerously-skip-permissions (safe — contained)
  Bind-mounted workspace at /workspace (one clone per agent)
  No Docker socket access
  No access to other agents' workspaces
  CPU/memory limits
```

### Clone vs Worktree for Docker

**Full clone** (Symphony's approach): Simplest. No `.git` path problems. Each agent has complete independence. Costs more disk but eliminates all shared-state issues.

**Worktree mounted from host**: Saves disk and shares git objects. But worktree `.git` files contain absolute paths that break when mounted into containers at different paths. Solvable by mounting the parent directory, but adds complexity.

**Recommendation**: Full clone for Docker-based isolation. Worktrees for local/non-Docker parallelism.

### The Orchestrator Problem

Three options for where the orchestrator runs:
1. **Host process** (recommended) — creates workspaces, spawns containers, manages merges. No Docker-in-Docker complexity. Blast radius containment applies to agents, not orchestrator.
2. **Docker with socket mount** — works but gives orchestrator container god-mode Docker access. The LLM must never reach the socket.
3. **Docker-in-Docker** — requires --privileged. Worse than option 2 in every way.

---

## Merge Pipeline Design for Production Repos

### The Sequential Landing Model

The safest approach, used by Symphony:

1. Agent finishes work -> creates PR on feature branch
2. CI runs (project-specific: tests, lint, type checks, etc.)
3. Agent (or orchestrator) attempts to merge
4. If branch is behind main: agent rebases, re-runs CI
5. If CI passes: squash-merge
6. Next agent's PR now needs rebase (main moved forward)
7. Repeat

**GitHub branch protection enforces this:** "Require branches to be up to date before merging" prevents stale branches from merging. The orchestrator controls landing order.

### Per-State Concurrency (Symphony's Insight)

Instead of a formal merge queue, limit how many agents can be in each state:
- Max N agents working (building/testing)
- Max 1-2 agents merging (prevents merge trains)
- Max N agents in human review (no limit needed)

This is simpler than GitHub Merge Queue and sufficient for the expected volume.

### Conflict Prevention

1. **Task design**: PRDs should assign non-overlapping file sets to parallel tasks. The architect's approach document reveals which files will be touched.
2. **Pre-dispatch check**: Before launching parallel agents, diff branch files against each other.
3. **Agent-driven resolution**: When conflicts occur during rebase, the agent resolves them (Symphony's `pull` skill pattern).
4. **Fallback**: If resolution fails or involves product-intent conflicts, mark blocked for human.

### What Each Production Repo Needs

1. **Its own CI** — tests, lint, type checks, whatever that project needs
2. **Branch protection on main** — require CI to pass, optionally require review
3. **The merge pipeline is a Orca skill** — not orchestrator logic. An agent instruction set for "check CI, handle conflicts, merge."

---

## Devin (Limited Data — May 2025 Cutoff)

As of May 2025, Devin ran one agent per sandboxed cloud VM. No multi-agent orchestration. Created PRs for human review, no auto-merge. Slack integration for questions. **Research gap: need current (March 2026) data on Devin's parallel capabilities.**

---

## Synthesis: Recommended Architecture for Orca

### Core Principles (from Symphony)

1. **Orchestrator is dumb, agents are smart.** The orchestrator manages lifecycle (dispatch, retry, reconcile). Workflow intelligence lives in prompts and skills.
2. **One workspace per agent.** Full git clone. No shared state between agents.
3. **Merge is a skill, not orchestrator logic.** Give agents instructions on how to merge (like Symphony's `land` skill).
4. **Per-state concurrency limits** prevent merge trains without complex queuing.
5. **The tracker is the control plane.** Humans manage priority and sequencing through familiar tools (Linear/GitHub Issues).

### Core Principles (from HumanLayer)

6. **Contact humans with tool calls.** When an agent needs human input, it's a tool invocation that routes to Slack/email, not a status change the human has to discover.
7. **Deterministic gates wrap non-deterministic actions.** Even if the LLM hallucinates, the approval gate is guaranteed.

### What Orca Should Build

1. **A `land` skill** — markdown instructions for agents to follow when merging their PR. Check CI, rebase if needed, resolve conflicts, squash-merge.
2. **A container launcher** — bash script or lightweight daemon that creates git clones on the host and spawns Docker containers per agent.
3. **Per-state concurrency** — the orchestrator limits how many agents can be in each pipeline state simultaneously.
4. **GitHub branch protection** as the safety net — require CI, require up-to-date branches.
5. **A lightweight human-contact mechanism** — Slack webhook when an agent is blocked and needs input, rather than a full HumanLayer integration.
