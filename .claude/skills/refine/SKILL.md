---
name: refine
description: Review a PRD for task sizing, description quality, and acceptance criteria
---

# PRD Refinement

Review the PRD file provided as an argument.

**Usage:** `/refine <prd-path>` (e.g., `/refine orca-context/prds/003-make-it-real.json`)

## How to Review

1. Read the PRD file
2. Read `prds/PRD_REFINE.md` — this is the source of truth for all refinement criteria
3. Apply every check in PRD_REFINE.md to every task in the PRD

The key checks (see PRD_REFINE.md for full detail):
- **The Architect Test** — would an architect have real decisions to make? Is the task under-visioned or over-prescribed?
- **Right-sized** — completable in one session, clear done state, explicit dependencies
- **Acceptance criteria** — test purpose not implementation, exercisable not just assertable
- **Verification approach** — does the task leave room for architect and implementer to think about testing at their level?

## Output Format

For each task, provide ONE of:
- **KEEP:** [task id] - [reason]
- **SPLIT:** [task id] into [subtasks]
- **MERGE:** [task ids] into [single task]
- **FIX:** [task id] - [what needs to change and why]

If all tasks pass: **PRD is ready**

Be practical, not pedantic. Focus on issues that would actually cause problems during execution.
