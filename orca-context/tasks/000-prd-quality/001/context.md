# Task Context: Strengthen PRD Verification and Outcomes

## Problem Statement

**Discovered:** The verification criteria across PRDs 001-004 are inconsistent in quality. Some describe existence ("document exists") rather than behavior. Some say things "work" without defining what working looks like. Some are genuinely strong but they're the exception, not the norm.

**Why it matters:** PRD 001 establishes testability foundations — but if the PRD's own verification criteria are vague, the testability work has no clear target. Weak verification propagates: vague criteria → vague tests → false confidence → real bugs. This must be fixed BEFORE foundation work begins.

**What was tried:** The success-criteria-format.md and problem-statement-structure.md patterns were developed during the founding design session. The spec-reviewer role was enhanced to check for these patterns. But the existing PRDs themselves haven't been held to this standard.

**Constraints:**
- This is a PROPOSAL, not direct PRD edits — the human reviews before changes are applied
- The proposal should show current vs proposed for easy comparison
- Don't over-specify — the point is clear verifiability, not turning criteria into implementation recipes (P3: Specification-Creativity Tradeoff)
- Investigation tasks (PRD 003) have inherently subjective outcomes — acknowledge this and propose the best achievable verification for non-code deliverables

## Supporting Files (co-located)

- **success-criteria-format.md** — the who/what/how pattern for writing verifiable criteria
- **problem-statement-structure.md** — 4-part structure for problem descriptions (relevant because some tasks' problems are vague too)
- **novel-verification-methods.md** — meta-cognitive pattern for inventing verification approaches when none obviously exist

## What to Look For

1. **Existence checks** ("document exists") — these prove nothing about quality
2. **Vague success** ("works correctly", "properly handles") — works how? handles what?
3. **Missing observability** — criteria that can't be checked without running the full system
4. **Missing failure modes** — criteria that only describe the happy path
5. **Investigation tasks** — these need verification appropriate to non-code deliverables (content quality, coverage of the question, actionability of recommendations)
