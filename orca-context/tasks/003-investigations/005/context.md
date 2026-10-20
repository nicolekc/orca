# Task Context: Not-Ready Tasks Investigation

## Problem Statement

**Discovered:** PRDs sometimes contain tasks that aren't ready to execute — they're seeds, placeholders, or ideas that need human refinement. We need a way to represent "this is here so we don't forget it, but DON'T execute it."

**Why it matters:** Without a "not ready" signal, orca might try to execute vague or incomplete tasks, wasting time and producing bad output.

**What was tried:** A "draft" status was added as a first pass (see draft-tasks-pattern.md co-located in this task's context folder — annotated as "INITIAL THINKING, not settled design"). Orca.md has "Skip tasks with status 'draft'" in the Rules section. But Nicole expressed uncertainty: "idk maybe a directory is better for drafts or future tasks."

**Constraints:**
- Nicole specifically flagged this as needing her own thinking before settling on a design
- The solution should balance: (1) clear "not ready" signal, (2) no unnecessary framework machinery, (3) human-inspectable
- The current "draft" status works as a minimal placeholder but isn't necessarily the right long-term design

## Alternatives to Consider

1. **Status field** (current): `"status": "draft"` on the task. Simple, but mixes readiness with execution state.
2. **Separate directory**: Draft PRDs or draft tasks live in a different location (orca-context/backlog/ ?)
3. **Backlog PRD**: A dedicated PRD for unrefined ideas, separate from execution PRDs
4. **Naming convention**: Prefix with _ or suffix with -draft
5. **Separate file**: A backlog.json that isn't a PRD, just a list of ideas

Each has tradeoffs around discoverability, simplicity, and risk of executing something not ready.
