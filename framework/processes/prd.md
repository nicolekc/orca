# PRD Process

Any agent working on a PRD task follows these rules.

## Pipeline Model

Every task has a `pipeline` — an ordered array of steps. Each step has a `role` and a `status`. The pipeline is populated by the **planner** role as the first thing that happens to any task.

```json
"pipeline": [
  {"role": "plan", "status": "complete"},
  {"role": "architect", "status": "complete"},
  {"role": "implementer", "status": "in_progress"},
  {"role": "code-cleaner", "status": "pending"}
]
```

The human wrote the task. The planner wrote the pipeline. You work the next pending step.

### Your Step

When you pick up a task, find the first step with `"status": "pending"`, confirm it matches your role, and do the work. When done, set your step to `"complete"`, commit the PRD update, and push.

If your role isn't the next pending step, pick a different task.

### Planning

Every task starts with planning. The planner reads the task and decides which roles need to process it, in what order. The planner writes the full pipeline array with all subsequent steps as `"pending"` and the plan step as `"complete"`.

A task with an empty pipeline hasn't been planned yet.

## Task States

- **draft** — Not ready. Skip entirely.
- **pending** — Ready to be planned. Empty pipeline.
- **in_progress** — Pipeline is being walked.
- **complete** — All pipeline steps done.
- **blocked** — Stuck after repeated attempts. Reason recorded in task folder.
- **split** — Replaced by sub-tasks. Do not process.
- **redo** — Human wants it redone. Clear pipeline, re-plan with their feedback.

## Splitting

The architect is the only role that can split a task. **Splitting is a core design tool, not a last resort.** Before writing a design, ask: does this task have separable concerns? If yes, split first, then design each piece.

When splitting:

- Add sub-tasks to the PRD: `003` becomes `003a`, `003b`, `003c`.
- Mark the parent `"status": "split"`.
- Each child starts with an empty pipeline — it enters from planning like any other task.
- Create a folder per sub-task in `orca-context/tasks/<prd-name>/` with enough context that the sub-task is self-sufficient.

## Verification Cascade

Each role thinks about verification at its level of abstraction and **writes it down** in the task context folder. Verification gets more concrete as the pipeline progresses.

**Planner** — Decides if the task needs QA review. High-level or high-risk tasks should include `qa-engineer` in the pipeline.

**Architect** — Includes verification strategy in the architecture: what systems and boundaries need testing, what would give confidence this works. Does not specify exact test cases — that's the implementer's job.

**Implementer** — Practices TDD. Writes tests that verify outcomes before writing implementation code.

**QA Engineer** (when included) — Reviews from the user's perspective. Produces a verification report in the task context folder with issues, reproduction steps, and what works. Marks the task for another implementer pass if needed. Can be added by the planner for tasks that are high-level, user-facing, or where the gap between "tests pass" and "it actually works" is large.

The key: verification thinking flows DOWN the pipeline, getting more concrete at each step. The architect's design notes (including verification thinking) inform the implementer's test design. The implementer's tests are the concrete realization of the architect's strategy.

## Durable Context

Each task gets a folder at `orca-context/tasks/<prd-name>/<task-id>/`. **Before starting your step, read what prior roles left there.** Write what the next role needs. No prescribed format.

The most important handoff: the architect's design notes inform the implementer's approach — including verification thinking embedded in the architecture. If you're the implementer and there's no context folder, you're either the first role or something went wrong — check the pipeline.

## Modifying the PRD

You may:
- Update your pipeline step status.
- Add sub-tasks (architect only, via splitting).
- Add new tasks you discover are needed (with empty pipeline, status `"pending"`).
- Mark tasks `blocked` with a reason.

You may not:
- Delete tasks.
- Modify completed tasks.
- Change another task's pipeline.

## Green Builds

Every task that changes code must leave all tests passing. Red builds are broken windows — they multiply quickly. Don't assume a failing test isn't yours. If tests fail when you're done, fix them before marking your step complete.

## Code Cleaning

The code-cleaner applies fixes directly — it doesn't kick back to the implementer. It commits corrections for correctness issues, simplifies unnecessary complexity, and aligns with project patterns. One pass, no rounds.

## Signoff Gates

A PRD may have a `signoff` field that limits how far pipelines are walked:

- `"plan"` — Only run planning.
- `"architecture"` — Walk up to and including architect.
- `"implementation"` — Walk up to and including implementer.
- `"full"` (default) — Walk full pipelines.

## Completion Assessment

When a task's pipeline finishes (all steps complete), the orchestrator **assesses the work before marking the task done**. This is not a rubber stamp — it's a real check.

### What to assess

1. **Test coverage honesty** — Are the tests testing real behavior, or just mocking everything? Unit tests with fully mocked dependencies prove the code compiles, not that it works. Note the gap clearly.
2. **Functionality gaps** — Does the implementation actually fulfill the task outcome and verification criteria? Read the task description again and compare to what was built.
3. **Runnability** — Can the human actually run and test what was built? What commands, what prerequisites (API keys, data, services)?

### What to produce

After the last pipeline step completes, the orchestrator writes a **handoff summary** to the human:

- **What was built** — Brief, concrete list of what's new or changed.
- **How to test it** — Exact commands, URLs, or steps. Include prerequisites (e.g., "requires ANTHROPIC_API_KEY"). If setup instructions changed, say so.
- **Known gaps** — What ISN'T tested, what might not work, what requires real API keys to validate. Be honest, not optimistic.
- **Confidence level** — "Works end-to-end" vs. "unit tests pass but never run against real APIs" vs. "scaffolding only."

### If gaps are found

Not every deviation is a gap. Distinguish:

- **Silent drops** (PRD says X, nobody mentioned X, just missing) → reopen the task.
- **Intentional deferrals** (architect considered X, documented reasoning and upgrade path) → note in handoff, don't override. The assessor has less context than the architect.
- **Unclear** → note in handoff, let the human decide.

The orchestrator does **not** silently fix issues. Reopen tasks for real gaps. Don't make reactive corrections to intentional decisions.

## Branch and PR

One branch per PRD: `orca/<prd-name>`. One PR per PRD.

Create the PR after the first completed pipeline step — don't wait until the end. The PR is a living view of progress. Each runner pushes after finishing their work so the PR stays current.

The PR evolves with every push. The human can review the PRD file on the PR at any time to see pipeline progress, new tasks from splitting, and task states.
