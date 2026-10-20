# Task Context: Human Inbox Investigation

## Problem Statement

**Discovered:** When orca produces non-code deliverables (investigations, designs, architecture decisions) that need human review, the current mechanism is a "needs_human_review" task status. But this is necessary and not sufficient — the human needs to know WHERE to look and WHAT to review.

**Why it matters:** Orca's investigation tasks and design tasks produce documents, not code. These can't be auto-merged — they need human judgment. If the human doesn't know where to find them or what to look for, they'll be ignored.

**What was tried:** The "needs_human_review" status was added to orca.md's task states. Non-code deliverables are written to orca-context/designs/ for lasting value. But there's no aggregation — the human has to hunt through directories.

**Constraints:**
- The solution should be simple enough to implement in one follow-up task
- It should work for both execution modes (PRD auto-execution and vibe coding)
- It should not require a UI — Nicole works in the terminal with Claude Code

## Approaches to Consider

- Summary file: orca generates a REVIEW.md after execution listing what needs review
- Specific directory: all needs-review items land in one place (orca-context/inbox/ ?)
- PRD status integration: the PRD file itself shows which tasks are awaiting review
- Git-based: a branch with only the review items, human reviews via PR
