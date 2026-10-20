# Bootstrap Plan: Full Synthesis

## What We're Building Toward

A framework where work cascades through a dev process naturally. No sequential handoffs — work is left "ready" when one worker's perspective is done, and the next picks it up. The cascade:

```
Product Planning (human, outcome-focused)
  → Lightweight Architecture (AI looks ahead for problems)
  → Human Revision
  → Sizing & Role Planning (AI decides how many perspectives needed)
  → [Full Cascade]:
      planner → explorer → architect → design reviewer
        → (loop until they agree)
        → implementer (TDD, creative license)
        → code-cleaner (fixes directly, no kickback)
        → qa-engineer (verifies, can kick back to implementer)
        → complete
```

The ratio is 1:[1..N]:1 — one human-defined outcome, one-to-many architect-defined engineering tasks (proportional to actual complexity, NOT Parkinson's Law), one engineer per task. A button color change gets a trivial architect pass. A system redesign gets real research, maybe a sub-PRD. The architect is the pivot: the only step that can split tasks and create new folders. See "Task Cascade Infrastructure" below for how this interacts with the task-folder-per-task invariant.

Workers NEVER plan ahead or do work they haven't been asked to do. They see "architecture is the next step available for task 4" and do that. They don't try to implement if implementation isn't their step.

This is the vision. The bootstrap gets us to the point where the framework itself can build the rest.

---

## Bootstrap Items (Must Be Done Manually)

These are the minimal changes needed before the framework can orchestrate its own further development. Everything after this happens THROUGH the framework.

### B1. Extract Perspectives from Roles (Soft/Hard Skill Separation)

**The insight**: Current role files mix soft skills (how to think) with hard skills (what to produce for a specific process). These must be separated because:
- CLAUDE.md should say "pick the right perspective" without loading confusing process instructions
- A subagent dispatched by Orca gets perspective + Orca-specific instructions
- A subagent dispatched by another framework gets the same perspective + different instructions
- An ad-hoc session loads a perspective without being told "produce a brief approach document"

**Files to create** (under `framework/perspectives/`):
- `architect.md` — How to analyze systems, evaluate tradeoffs, think structurally. NO "What You Produce."
- `code-cleaner.md` — Applies code review principles to make fixes directly. No kickback, no opinions — just fixes.
- `design-reviewer.md` — How to evaluate designs. Light cleanup to remove hard skills.
- `spec-reviewer.md` — How to evaluate specs. Light cleanup.
- `explorer.md` — How to trace codebases: entry points, call chains, layers. Inspired by feature-dev's code-explorer.

**`framework/roles/`** goes away. Perspectives replace the soft skill content. Hard skill content (output formats) moves into the orchestrator's dispatch language.

**Key principle**: A perspective file is safe to load in ANY context. It never tells you what to produce or who dispatched you.

### B2. Adapt `orca.md` for Subagent Orchestration

**The point**: Instructions a human can launch that follow the Orca process FROM WITHIN a single agent using subagents, compliant with Claude subscription TOS (no external automated wrapper).

**Core design**:
- Orca reads the PRD, works through ALL incomplete tasks
- **Hard invariant**: One subagent works on exactly one (task, pipeline step) tuple. It completes that step, pushes, and stops. Orca decides what to dispatch next.
- Subagent dispatch is NOT dynamic prompt composition. Orca says: "Apply the architect perspective from `.orca/perspectives/architect.md`. Read task context at `orca-context/tasks/<prd>/<task>/`. The task is: [description]." The agent reads files itself.
- Proportionality: Orca decides what's proportionate. A rename skips architect. A redesign gets the full cycle. This is judgment, not a menu.
- Context flows through shared task directories. Agents read what's there, add what the next agent needs. No prescribed formats.
- Parallel independent tasks: dispatch multiple subagents for independent tasks simultaneously.
- Circuit breaker: 3 rounds max, then block and move on.
- Each runner pushes after finishing their step. PR created on first completed step and evolves with each push.

**Two execution modes** (same core instructions, documented in orca.md):

| | Bash Loop Mode | Subagent Mode |
|---|---|---|
| Tasks per invocation | ONE (loop restarts) | ALL incomplete |
| Completion signal | `<promise>COMPLETE</promise>` (bash detects substring) | Just finish — parent agent recognizes semantically |
| How work gets done | You ARE the agent | Dispatch via Task tool |
| Who tests/commits | You | The subagent |

**ORCA_PROMPT.md** becomes thin wrapper: "Read `.orca/orca.md`. You are in bash-loop mode. PRD file is: [from script]."

**`/orca` skill** points to orca.md, notes subagent mode.

### B3. State the Principles in seed.md

Add to `framework/seed.md` (travels with the framework to every project):

- **Autonomy**: Work until done. Don't ask permission, confirmation, or selection between options. Stop only when: (1) done, (2) truly blocked on something unsolvable, (3) human asks. No "present 3 options." No "you MUST ask the user."
- **Proportionality**: Match effort to complexity. Agent decides what's proportionate.
- **Shared context**: Task directories accumulate naturally. Read what's there. Write what the next agent needs. No prescribed formats.
- **Verification rigor** (the big one): Do not accept surface-level evidence that something works. Actively seek the strongest possible verification — build the thing, run the thing, prove it works. If a test framework isn't functioning, fixing it IS part of verification. If a dependency is missing, finding and integrating it IS part of verification. You don't get to say "verified" until you've genuinely tried to break it. This is not a per-task checklist — it's a universal principle about what "done" means.

### B4. CLAUDE.md → seed.md Entry Point

CLAUDE.md in any repo gets a one-liner: "Read `.orca/seed.md` before starting any task."

seed.md is the framework entry point. It contains the working principles AND navigates to perspectives and processes: "Pick a perspective from `.orca/perspectives/`. When working on PRD tasks, also read `.orca/processes/prd.md`."

The chain: CLAUDE.md → seed.md → perspectives + processes. seed.md is the single file that bootstraps framework awareness.

### B5. Progressive Context Architecture

Structure the knowledge so any fresh CLI session can reconstruct our perspective by following references:

- **CLAUDE.md** = root node. Says what the project is, where to look.
- **CLAUDE.md references** → project principles (in seed or docs)
- **Principles reference** → specific knowledge files, design decisions, investigations
- **Task context directories** → per-task research, brain dumps, design notes

The chain: CLAUDE.md → principles → knowledge → task context. A new session loads CLAUDE.md, sees it needs to understand verification philosophy, follows the reference, loads that, sees it references investigation notes about e2e approaches, loads those if relevant.

For orca-docker specifically: capture what we've learned in this conversation into the right places in this tree. The conversation insights need to become loadable documents.

### B6. Clarify the framework/ Boundary

State explicitly that `framework/` IS the separation line:

**Installed into target projects**: `framework/seed.md`, `framework/perspectives/`, `framework/orca.md`, `framework/processes/`, `framework/templates/`

**Stays in orca-docker**: `docs/`, `CLAUDE.md`, `orca-context/`, Docker/bash scripts

---

## What Does NOT Change (in Bootstrap)

- `framework/processes/build-cycle.md` — stays as default pattern (will evolve later through the framework)
- `framework/templates/prd.json` — fine as-is
- `orca-context/` structure — task directories already work
- `.orca-tasks/` — ephemeral workspaces stay
- `orca-loop.sh`, `orca-once.sh`, `orca-start.sh`, `orca-clone.sh`, `orca-reset.sh` — all stay
- `.claude/skills/discover/`, `.claude/skills/refine/` — no changes
- Task states, signoff gates, circuit breaker, branch hygiene — all same

---

## File-by-File Summary (Bootstrap Only)

**Create**:
- `framework/perspectives/architect.md`
- `framework/perspectives/code-cleaner.md`
- `framework/perspectives/design-reviewer.md`
- `framework/perspectives/spec-reviewer.md`
- `framework/perspectives/explorer.md`

**Rewrite**:
- `framework/orca.md` — unified orchestrator (subagent + bash-loop), reference perspectives
- `framework/seed.md` — add autonomy, proportionality, shared context, verification rigor
- `ORCA_PROMPT.md` — thin wrapper
- `.claude/skills/orca/SKILL.md` — point to orca.md
- `CLAUDE.md` — role selection at top, context references, framework/ boundary

**Replace**:
- `install.sh` — natural language description of end-state, not a script

**Update**:
- `docs/execution-strategies.md` — reflect both modes
- `docs/structure.md` — perspectives directory, framework/ boundary

**Remove**:
- `framework/roles/` — replaced by `framework/perspectives/`

---

## Order of Operations (Bootstrap)

1. Create `framework/perspectives/` from current roles (extract soft skills)
2. Rewrite `framework/orca.md` (unified orchestrator, both modes, reference perspectives)
3. Add principles to `framework/seed.md` (autonomy, proportionality, shared context, verification rigor)
4. Simplify `ORCA_PROMPT.md` to thin wrapper
5. Update `.claude/skills/orca/SKILL.md`
6. Build out progressive context in CLAUDE.md and docs
7. Replace `install.sh` with natural language description
8. Remove `framework/roles/`
9. Update `docs/structure.md` and `docs/execution-strategies.md`
10. Sync `.orca/` from `framework/`
11. Commit and push

Steps 1-3 are the substantive work. Everything else follows.

---

## After Bootstrap: What the Framework Builds Next

Once the bootstrap lands, these are done THROUGH the framework (as PRDs, architect phases, etc.):

### The Cascade Workflow (Build Cycle Evolution)

Evolve `build-cycle.md` to support the full cascade:
- **Product planning** (human, outcome-focused PRD — deliberately non-specific about HOW)
- **Lightweight architecture** (AI looks ahead for problems, human revises)
- **Sizing & role planning** (AI decides how many perspectives needed per task)
- **Full cascade**: planner → investigator → architect → design reviewer → (loop) → implementation engineer (TDD, creative license) → QA engineer → complete
- The 1:[1..N]:1 ratio: one human outcome, N architect tasks (proportional, uniformly sized), one engineer each
- Work left "ready" when one step completes — NOT sequential handoffs
- Workers never plan ahead or do work outside their step

### Task Cascade Infrastructure

**The invariant**: After the architect step, every step works in exactly one task folder. Context accumulates there. No ambiguity about where to read or write.

**How the architect's 1:[1..N] split works with folders**:

The architect is the pivot point — the only step that can create new tasks. Everything before the architect works at the PRD task level. Everything after works at the (possibly split) engineering task level.

**When the architect splits** (1:N — e.g., task 003 becomes 003a, 003b, 003c):

```
orca-context/tasks/<prd>/
  003/                  # PRD-level task. Architect works HERE.
    architect-analysis  # Holistic analysis: why it split, overall design, dependencies between sub-tasks
  003a/                 # Sub-task a — self-contained engineering task
    (architect seeds relevant context slice here)
    (engineer, reviewer, QA all accumulate here)
  003b/                 # Sub-task b — same pattern
  003c/                 # Sub-task c — same pattern
```

Rules:
- The architect's holistic analysis lives in the parent folder (003/). It's the record of WHY the split happened and how the pieces relate.
- Each sub-task folder is seeded by the architect with everything the engineer needs. The engineer does NOT need to read the parent folder — the architect's job is to make each sub-task folder self-sufficient.
- From the sub-task folder onward, the one-folder invariant holds: engineer, reviewer, QA all work in that folder. Context accumulates there.

**When the architect doesn't split** (1:1 — task stays as-is):

```
orca-context/tasks/<prd>/
  003/                  # Architect works here. Engineer picks it up here.
    (everything accumulates in this one folder)
```

No sub-folders, no nesting. The architect's output is in the same folder the engineer will use. Simple.

**Context within a task folder**:
- Single context log listing who worked and what context files they wrote (NOT code files — code search works normally). The context log is the breadcrumb.
- Each step reads what's there, writes what the next step needs. No prescribed formats.

**The "ready" concept**: Tasks cascade through steps. When architecture is done, the implementation step becomes "ready" for pickup. Any step can be picked up at any point — agents see what's next available and do it.

### Branch/PR Management

- One branch per PRD: `orca/<prd-name>`. One PR per PRD.
- PR created after first completed pipeline step — it's a living dashboard that evolves with each push.
- Each runner pushes after finishing their work so the PR stays current.
- The human can review the PRD file on the PR at any time to see pipeline progress.

### QA Engineer Perspective

A new perspective for verification. This is distinct from code-reviewer:
- Assesses whether implementation engineer's verifications are actually strong
- Writes new tests if coverage is incomplete
- Sends bugs back to implementation engineer
- Embodies the "refuse to accept weak evidence" principle operationally

### Docker Super Folder

Container can be in a super folder, accessing multiple repos. Relates to multi-repo orchestration design in `orca-context/tasks/004-framework-evolution/004/docker-multi-repo.md`.

### PRD Rework

Rewrite existing PRDs (000-004) to be outcome-only. Remove prescriptive implementation steps. The architect phase (once the cascade is built) handles the HOW.
