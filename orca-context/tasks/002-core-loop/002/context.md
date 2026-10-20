# Task Context: Validate Spec Review Gate

## Problem Statement

**Discovered:** Nicole identified that the spec reviewer should be a defined GATE (a process step that blocks implementation until specs are approved), not just an optional role you can invoke if you feel like it. The distinction matters: a gate means implementation doesn't start until spec quality is verified.

**Why it matters:** Bad specs → bad implementations → expensive rework. The entire Specification-Creativity Tradeoff (P3) depends on specs being the right quality — clear enough to act on but not so detailed they become recipes. The spec review gate catches both problems: vague specs AND over-specified specs.

**What was tried:** The spec reviewer role was enhanced with:
- Success criteria quality check (who/what/how pattern — see orca-context/tasks/000-prd-quality/001/success-criteria-format.md)
- Problem statement completeness check (discovered/whyItMatters/whatWasTried/constraints — see orca-context/tasks/000-prd-quality/001/problem-statement-structure.md)
- The build cycle (framework/processes/build-cycle.md) now has an optional step 0: spec review gate

**Constraints:**
- The gate is optional ("Can be skipped for well-refined PRDs") — it shouldn't be mandatory for every run
- This task VALIDATES the already-implemented gate, it doesn't implement it
- Intentionally include a vague criterion in the test PRD to verify the reviewer catches it
- Also validate progress.txt conventions — are the timestamped per-role entries practical?

## Files to Review

- orca-context/tasks/000-prd-quality/001/success-criteria-format.md — the who/what/how pattern for acceptance criteria
- orca-context/tasks/000-prd-quality/001/problem-statement-structure.md — 4-part problem description
- framework/perspectives/spec-reviewer.md — the enhanced spec reviewer perspective
- framework/processes/build-cycle.md — step 0 is the spec review gate
