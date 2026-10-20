# Exploration: Execution Mode Duplication (Task 002)

## Overview

Two execution modes exist for running PRD tasks:
1. **Bash-loop mode** — headless, Docker-based, one task per iteration via `claude -p`
2. **Subagent mode** — interactive, subscription-based, dispatches subagents via `/orca` skill

The bootstrap plan (`orca-context/tasks/bootstrap/plan.md`, lines 66-77) explicitly called for ORCA_PROMPT.md to become a thin wrapper pointing to `orca.md`, and for the `/orca` skill to do the same. This was only partially accomplished. `orca.md` was rewritten for subagent orchestration only, while ORCA_PROMPT.md retained its own full, divergent instruction set.

---

## File-by-File Analysis

### orca.md (framework/orca.md = .orca/orca.md, identical)

The current shared instructions file. 44 lines. It is entirely oriented toward **subagent mode**:

- **Startup** (lines 7-8): Read CLAUDE.md, read PRD + process.
- **Roles** (lines 12-20): Lists active roles and future roles (planner, architect, implementer, code-cleaner, design-reviewer, spec-reviewer, explorer, qa-engineer).
- **Your Job** (lines 24-36): "Dispatch subagents." Hard invariant: one subagent per (task, pipeline step) tuple. Parallelization. Circuit breaker (3 attempts). "You don't implement. You dispatch and track."
- **Branch and PR** (lines 38-44): One branch per PRD, push after finishing.

Key observation: orca.md contains **zero** bash-loop-mode content. It is exclusively subagent-mode. There is no shared core that both modes reference.

### ORCA_PROMPT.md (root, 75 lines)

The instruction set for bash-loop mode. Read by `claude -p` at each iteration.

**Structure:**
- Lines 1-3: "Read these files first" — CLAUDE.md, the PRD file, progress.txt.
- Lines 5-22: "Your Job (ONE TASK PER ITERATION)" — 9-step procedure including branch creation, task selection (`testsPassing: false`), implementation, testing, committing, updating PRD, appending to progress.txt, stopping.
- Lines 24-31: Rules — one task per iteration, no drive-by refactoring, never push to main, never commit failing tests, small commits, 3-strike blocked rule.
- Lines 33-45: Modifying the PRD — adding tasks, splitting tasks (003 -> 003a/b/c), no deletions.
- Lines 47-63: After Each Task — append to progress.txt with template.
- Lines 65-74: When All Tasks Complete — push, emit `<promise>COMPLETE</promise>`, message.

**Critical divergences from current framework:**
1. Uses `testsPassing` field instead of the pipeline model from `processes/prd.md`.
2. No concept of pipeline steps, roles, or perspectives.
3. Its own PRD modification rules (simpler, different from prd.md's rules).
4. References `progress.txt` as a tracking mechanism (not used anywhere in the subagent mode).
5. Uses `<promise>COMPLETE</promise>` as a completion signal (bash-loop-specific).
6. Task splitting rules are similar but use `"split": true` vs `"status": "split"`.

### SKILL.md (.claude/skills/orca/SKILL.md, 11 lines)

The `/orca` skill entry point. Extremely thin:
```
You are now operating as Orca. Read `.orca/orca.md` for your full instructions.
Your PRD file is: $ARGUMENTS
```

This is already the "thin wrapper" the bootstrap plan envisioned. All actual logic lives in orca.md.

### orca-loop.sh (root, 100 lines)

The bash loop runner. Mechanics:
- Takes PRD file, max iterations (default 20), prompt file (default ORCA_PROMPT.md).
- Creates log directory, runs `claude -p "Read $PROMPT_FILE for instructions. The PRD file is: $PRD_FILE"` in a loop.
- Checks output for `<promise>COMPLETE</promise>` to detect completion.
- Sleeps 2 seconds between iterations.

Key: The loop script itself has no task knowledge. It just passes the prompt file and PRD to `claude -p` and checks for the completion signal. All task logic is in ORCA_PROMPT.md.

### orca-once.sh (root, 38 lines)

Single-iteration variant of orca-loop.sh. Same invocation pattern:
`claude -p "Read $PROMPT_FILE for instructions. The PRD file is: $PRD_FILE"`

### orca-start.sh (root, 65 lines)

Docker container launcher. Mounts project, manages container lifecycle. Has no task logic -- purely infrastructure.

---

## Duplication and Divergence Analysis

### What ORCA_PROMPT.md and orca.md/SKILL.md share (conceptually)

These are the **core concepts** both modes need:

| Concept | ORCA_PROMPT.md | orca.md | prd.md |
|---------|-----------------|----------|--------|
| Read CLAUDE.md first | Yes (line 4) | Yes (line 7) | No |
| Read the PRD | Yes (line 5) | Yes (line 8) | No |
| Branch naming: `orca/<prd-name>` | Yes (line 13) | Yes (line 40) | Yes (line 83) |
| Never push to main | Yes (line 29) | Implicit | Yes (via branch rule) |
| Small commits | Yes (line 30) | Implicit in "each runner pushes" | No |
| Circuit breaker (3 strikes -> blocked) | Yes (line 31) | Yes (line 35) | No |
| Task splitting (003 -> 003a/b/c) | Yes (lines 39-43) | No (defers to prd.md) | Yes (lines 43-49) |
| No drive-by refactoring | Yes (line 28) | No | No |
| Don't delete tasks | Yes (line 45) | No | Yes (line 63) |
| Push after finishing work | Implicit (line 69) | Yes (line 44) | Yes (line 85) |

### What diverges

| Aspect | ORCA_PROMPT.md (bash-loop) | orca.md + prd.md (subagent) |
|--------|---------------------------|------------------------------|
| Task model | `testsPassing: true/false` | Pipeline with roles and statuses |
| Task selection | "Choose BEST NEXT TASK with testsPassing: false" | "Find first pending pipeline step matching your role" |
| Who does the work | "You ARE the agent" | "Dispatch subagents, you don't implement" |
| Tasks per invocation | ONE, then stop | ALL incomplete tasks |
| Tracking | progress.txt (append-only log) | PRD pipeline status + task directories |
| Completion signal | `<promise>COMPLETE</promise>` | Semantic (just finish) |
| Perspectives/roles | None referenced | Full role system (planner, architect, etc.) |
| PRD process file | Not referenced | `.orca/processes/prd.md` |
| Seed file | Not referenced | Referenced via CLAUDE.md chain |

### What's unique to each mode

**Bash-loop only:**
- `progress.txt` mechanism
- `<promise>COMPLETE</promise>` signal
- "ONE TASK PER ITERATION" rule
- The 9-step procedure (implement, test, commit, update PRD, append progress, stop)
- `testsPassing` field on tasks

**Subagent only:**
- Dispatching via Task tool
- Role/pipeline system
- Parallelization of independent tasks
- "You don't implement. You dispatch and track."
- Role list and future roles

---

## Core Concepts Both Modes Should Share

These belong in a unified orca.md (or a shared section within it):

1. **Startup sequence**: Read CLAUDE.md, read the PRD, read prd.md process
2. **Pipeline model**: Tasks have pipelines with roles and statuses (prd.md already covers this)
3. **Role list**: What roles exist and what they do
4. **Branch strategy**: `orca/<prd-name>`, never push to main
5. **Commit discipline**: Small commits, push after finishing
6. **Circuit breaker**: 3 attempts then mark blocked
7. **PRD modification rules**: What you may/may not change (already in prd.md)
8. **Task splitting**: Architect-only, parent marked split (already in prd.md)
9. **No drive-by refactoring**: Stay in scope (already in seed.md)

## Mode-Specific Concerns

**Bash-loop mode needs:**
- "ONE task pipeline step per iteration, then stop"
- `<promise>COMPLETE</promise>` when all tasks done (so the bash script can detect it)
- "You ARE the agent doing the work" (not dispatching)
- How `progress.txt` works (or whether to drop it in favor of pipeline status)

**Subagent mode needs:**
- "Dispatch subagents, you don't implement"
- Hard invariant: one subagent per (task, pipeline step) tuple
- Parallelization guidance
- Subagent dispatch pattern (perspective + task context + description)

---

## Key Findings for the Architect

1. **ORCA_PROMPT.md is completely out of date.** It uses a pre-bootstrap task model (`testsPassing` instead of pipelines), does not reference perspectives or the PRD process, and has its own divergent PRD modification rules. It was supposed to become a thin wrapper during the bootstrap (per plan.md line 75) but was never rewritten.

2. **orca.md is subagent-only.** The bootstrap plan (plan.md lines 66-77) called for orca.md to contain unified instructions for both modes with a mode-difference table. Instead, orca.md was written purely for subagent orchestration.

3. **SKILL.md is already the right shape.** It's a thin pointer to orca.md. No work needed there beyond ensuring orca.md covers everything.

4. **prd.md already covers most shared task concepts.** Pipeline model, task states, splitting, PRD modification rules, branch/PR strategy are all in prd.md. orca.md shouldn't duplicate these -- it should reference prd.md (which it already does at line 8).

5. **The `progress.txt` mechanism may be obsolete.** The pipeline model in prd.md tracks status per step. If bash-loop mode adopts the pipeline model, `progress.txt` might only serve as a human-readable log (optional, not load-bearing).

6. **The bash scripts (orca-loop.sh, orca-once.sh) need minimal changes.** They just pass a prompt file and check for the completion signal. The prompt file content is what needs to change, not the scripts themselves. The only script-level concern is the `<promise>COMPLETE</promise>` detection, which is a bash-loop-mode-specific detail that belongs in the thin wrapper, not in shared instructions.

7. **orca-start.sh is pure infrastructure.** No task logic, no changes needed for this task.
