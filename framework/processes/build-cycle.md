# Build Cycle

The standard process for completing a task. Used by Orca when orchestrating, or by a human directing agents manually.

## The Cycle

```
[spec review] → architect → implement → review → (fix → review)* → done
```

0. **Spec review** (optional gate): Before the first task in a new PRD, review all task specs for clarity, scope, and specification-creativity balance. This is a gate — if specs need revision, stop and revise before proceeding. Can be skipped for well-refined PRDs.

1. **Architect** analyzes the task. Produces an approach (what to change, why, constraints). Does NOT produce step-by-step instructions — the implementer is skilled.

2. **Implementer** executes the approach. Writes code, writes tests, runs tests, commits when passing.

3. **Reviewer** checks the implementation. Stage 1: correctness (did they build the right thing?). Stage 2: quality (is it clean and tested?).

4. If the reviewer finds issues, the **implementer** fixes them with the review feedback as context. Then back to review. Max 3 rounds.

5. If still unresolved after 3 rounds, the task is **blocked**. Record the issue. A human or architect decides what to do next.

## When to Skip Steps

- **Trivial tasks** (rename, config change, one-line fix): skip architect, go straight to implement + review.
- **Pure investigation** (research, analysis): only architect. No implementation.
- **Already designed**: if the task has an approved design document, skip architect.

Use judgment. The cycle is a default, not a mandate.

## Parallel Tasks

If tasks are independent (no shared files, no dependency relationship), they can run through the cycle in parallel. Orca dispatches separate subagent chains for each.

## Redo

When a human marks a task for redo with feedback:
1. The feedback becomes additional context for the architect
2. Re-run the cycle from architect (or from implement if the approach was fine)
3. Check dependent tasks — they may need to adapt
