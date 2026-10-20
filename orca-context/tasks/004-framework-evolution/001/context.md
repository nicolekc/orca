# Task Context: Knowledge Integration Proposal

## Problem Statement

**Discovered:** During the founding design session, generalizable knowledge was captured in working notes. These are now distributed across task context folders. Some of this knowledge benefits EVERY user of orca-docker and belongs in the framework itself — but where exactly, and how much?

**Why it matters:** A fresh project installing orca-docker gets framework/ (via .orca/) but NOT orca-context/. If success criteria guidance, problem statement structure, design philosophy, etc. only live in orca-context/, new projects don't benefit. But blindly copying everything into framework/ risks bloat and violating P8 (Lightning-Quick Descriptions).

**What was tried:** The spec-reviewer role was already partially enhanced with success criteria quality checks and problem statement completeness. But the full knowledge hasn't been systematically mapped to framework locations.

**Constraints:**
- This is an INVESTIGATION producing a PROPOSAL, not direct integration
- The human reviews and decides what goes where
- Framework files should remain concise (P8)
- Some knowledge may be better as project context than framework content
- Don't lose nuance by over-condensing — propose the right level of detail for each target

## Knowledge Sources to Review

1. **design-philosophy.md** (co-located) — what the framework IS and ISN'T. Could be seed, framework README, or stay as project context.
2. **frameworks-research.md** (co-located) — OMC/Superpowers/Gas Town analysis, universal patterns and anti-patterns. Anti-patterns section could become framework guidance.
3. **success-criteria-format.md** (at orca-context/tasks/000-prd-quality/001/) — who/what/how pattern. Partially in spec-reviewer already.
4. **problem-statement-structure.md** (at orca-context/tasks/000-prd-quality/001/) — 4-part structure. Partially in spec-reviewer already.
5. **PRD_REFINE.md** (at prds/) — battle-tested insights from 160+ Promptly tasks.

## For Each Source, the Proposal Should Answer

- What specific content is generalizable vs project-specific?
- Which framework file(s) should it live in? (existing role? new process doc? template?)
- How much detail belongs in framework/ vs is too much for a composable tool?
- Does integration require changes to multiple framework files (a coupling smell)?
