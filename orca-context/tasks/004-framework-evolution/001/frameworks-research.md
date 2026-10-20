# Frameworks Research: OMC, Superpowers, Gas Town

Investigated 2026-02-12. All three are MIT licensed and represent the current state of Claude Code agent frameworks.

## Oh My Claude Code (OMC)
- **Repo**: github.com/Yeachan-Heo/oh-my-claudecode (~50k stars)
- **Core idea**: Multi-agent swarm orchestration. "You are the conductor, not the performer."
- **30 agents** organized by model tier (Opus/Sonnet/Haiku). Includes: architect, critic, planner, executor, researcher, designer, qa-tester, security-reviewer, build-fixer, git-master, etc.
- **6 orchestration modes**: team, autopilot, ultrawork, orca, swarm, pipeline, ecomode — triggered by magic keywords.
- **What's good**: Smart model routing (cheap models for simple tasks). Tool restrictions per role (architect is read-only). Separation of planning from execution. Evidence-based analysis (cite file:line).
- **What's fragile**: 30-agent taxonomy creates a classification/routing problem. Magic keyword triggers. Hardcoded model tiers. `.omc/` directory with inter-file sync requirements.

## Superpowers
- **Repo**: github.com/obra/superpowers (~50k stars, by Jesse Vincent)
- **Core idea**: Skills-based methodology enforcement. Skills auto-activate based on context.
- **14 skills**: TDD, systematic-debugging, brainstorming, writing-plans, executing-plans, subagent-driven-development, parallel-agents, git-worktrees, finishing-a-branch, code-review (requesting/receiving), verification-before-completion, writing-skills.
- **"THE RULE"**: If even 1% chance a skill applies, MUST invoke it. Anti-rationalization tables preemptively block excuses.
- **What's good**: Systematic debugging methodology (4 phases, circuit breaker at 3 failures). "Plans assume zero context" insight. Two-stage code review (correctness then quality). Git worktree isolation. Skills are TDD for process (RED/GREEN/REFACTOR).
- **What's fragile**: Anti-rationalization is adversarial prompt engineering arms race. Absolute TDD enforcement ("write code before test? delete it") is dogmatic. ~22k tokens at session start (reported issue). Mandatory skill announcements waste tokens. Rigid file path conventions.

## Gas Town
- **Repo**: github.com/steveyegge/gastown (by Steve Yegge)
- **Core idea**: Workspace orchestration CLI (Go). Persistent agent identities, git-backed work tracking, inter-agent communication.
- **8 roles**: Mayor (coordinator), Polecat (ephemeral workers), Witness (oversight), Refinery (merge queue), Deacon, Crew, Dog, Boot.
- **Terminology**: Towns, Rigs, Beads, Convoys, Hooks, Sling, GUPP principle.
- **What's good**: Git-backed persistence surviving crashes. Clean coordination/implementation separation. "Sling liberally, fix when fast" heuristic. Explicit escalation protocol. Crash recovery by design (`gt prime`). Refinery concept for merge conflicts. Two-level issue tracking (hq-* vs rig-*).
- **What's fragile**: Extensive custom vocabulary. Heavy infrastructure requirements (Go 1.23+, Git 2.25+, Beads, SQLite3, tmux). Steam engine metaphor wastes tokens. Capability Ledger assumes persistent identities that conflict with ephemeral LLM sessions.

## Universal Good Principles (across all three)
1. Separate planning from execution
2. Read before writing (evidence-based analysis)
3. Escalation/circuit breaker when stuck
4. Isolated workspaces per task
5. Evidence over assumption (cite specific code)

## Universal Fragile Patterns (across all three)
1. Custom vocabulary users must learn
2. Prescriptive file structures
3. Anti-cheat enforcement (spending tokens telling agents what NOT to do)
4. Hardcoded model tiers
5. Ceremony over substance (announcements, magic keywords, verbose metaphors)

## What We Adapted
- Read-only architect principle (OMC) → demoted to flexible guideline
- Two-stage code review (Superpowers) → our code-reviewer role
- Circuit breaker at 3 failures (Superpowers) → our P11
- Coordination/implementation separation (Gas Town/OMC) → our orca orchestrator
- Plans-assume-zero-context (Superpowers) → **rejected as stated**, replaced with P3 (Specification-Creativity Tradeoff): rich context + trust > detailed instructions

## What We Explicitly Rejected
- Custom vocabulary (all three)
- Mandatory activation rules (Superpowers)
- 30-agent taxonomies (OMC)
- Anti-rationalization tables (Superpowers)
- Hardcoded model tiers (OMC)
- Heavy infrastructure requirements (Gas Town)
- "Assume zero context" as a principle (Superpowers) — replaced with P3
