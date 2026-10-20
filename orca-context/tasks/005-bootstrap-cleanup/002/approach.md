# Approach: Unify Execution Mode Instructions

## Problem

`orca.md` is subagent-only. `ORCA_PROMPT.md` is a stale, divergent copy of pre-bootstrap instructions. The bootstrap plan (plan.md:66-77) called for orca.md to be the shared core with thin mode wrappers, but only the subagent side was built.

## Design

### Restructure orca.md as two sections: shared core + subagent mode

orca.md currently has: Startup, Roles, Your Job (subagent-specific), Branch and PR.

Rewrite it as:

1. **Startup** (shared) -- Read CLAUDE.md, read the PRD, read `.orca/processes/prd.md`. Same as today.
2. **Roles** (shared) -- Active/future role list. Same as today.
3. **Execution** (shared) -- The invariants that apply to both modes:
   - One (task, pipeline step) at a time per agent. Complete it, push, stop.
   - 3 attempts then mark blocked.
   - Every agent pushes after finishing work.
4. **Branch and PR** (shared) -- Same as today.
5. **Subagent Mode** -- "You dispatch subagents; you don't implement." Parallelization. Hard invariant about one subagent per tuple. This section only matters when Orca is running as an orchestrator via `/orca`.

This keeps orca.md as a single file. The subagent-mode section is clearly labeled so bash-loop agents can ignore it.

### Rewrite ORCA_PROMPT.md as a thin wrapper

Replace the entire 75-line file with ~10 lines:

```
# Orca (Bash-Loop Mode)

You are Orca operating in bash-loop mode. Read `.orca/orca.md` for core instructions.

Your PRD file is: (passed by the script)

## Bash-Loop Rules

- **One pipeline step per iteration.** Complete one (task, pipeline step), push, then stop.
- **Completion signal:** When all tasks in the PRD are complete or blocked, output `<promise>COMPLETE</promise>` so the loop script can detect it.
- **You are the agent.** You do the work directly -- you don't dispatch subagents.
```

This mirrors what SKILL.md already does for subagent mode. The script invocation (`claude -p "Read ORCA_PROMPT.md..."`) stays the same -- no changes to orca-loop.sh or orca-once.sh.

### Drop progress.txt from the instructions

The pipeline model in prd.md tracks task status per step. progress.txt was a pre-bootstrap tracking mechanism. It is now redundant -- the PRD file is the source of truth for what's done.

Remove the progress.txt references from ORCA_PROMPT.md. If a progress.txt file exists in the repo, leave it alone (it's historical, not harmful). Don't add progress.txt to ORCA_PROMPT.md's new thin wrapper.

### Drop testsPassing references

ORCA_PROMPT.md's task model (`testsPassing: true/false`) is the old pre-bootstrap model. The pipeline model from prd.md replaces it entirely. The new thin wrapper points to orca.md which points to prd.md -- the correct task model flows through.

## What changes

| File | Change |
|------|--------|
| `framework/orca.md` | Restructure: extract shared core, label subagent section |
| `.orca/orca.md` | Sync from framework/ |
| `ORCA_PROMPT.md` | Rewrite to thin wrapper (~10 lines) |
| `orca-loop.sh` | No change (already reads ORCA_PROMPT.md, checks for COMPLETE signal) |
| `orca-once.sh` | No change |
| `.claude/skills/orca/SKILL.md` | No change (already a thin wrapper) |
| `docs/execution-strategies.md` | Minor update: reflect that both modes share orca.md |

## What does NOT change

- `prd.md` -- already correct, shared by both modes
- `seed.md` -- no execution-mode content
- bash scripts -- they just pass the prompt file and check for the signal
- SKILL.md -- already the right shape

## Key decisions

1. **Single file, not a split.** orca.md stays as one file with a labeled subagent section rather than splitting into orca-core.md + orca-subagent.md. Reason: two files means two reads and a routing decision. One file with a labeled section is simpler and keeps token cost low.

2. **ORCA_PROMPT.md stays as a file** (rather than inlining the prompt into orca-loop.sh). Reason: the bash scripts take the prompt file as a parameter, which lets users customize. Keeping the file preserves this without script changes.

3. **progress.txt is dropped from instructions, not deleted.** If it exists in a project, it won't hurt anything. But new instructions don't tell agents to write to it.

## Verification

After implementation:
- Read orca.md and confirm: shared core is mode-neutral, subagent section is clearly labeled.
- Read ORCA_PROMPT.md and confirm: thin wrapper, points to orca.md, adds only bash-loop-specific rules.
- Read SKILL.md and confirm: thin wrapper, points to orca.md (no change needed).
- Confirm orca-loop.sh and orca-once.sh are unchanged (they still work because they read ORCA_PROMPT.md which points to orca.md).
- Confirm no duplicated instructions exist between ORCA_PROMPT.md and orca.md.
- Confirm a core concept change in orca.md (e.g., adding a role) would be seen by both modes.
