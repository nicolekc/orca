# Task Context: 6 Standalone Design Docs

## Problem Statement

**Discovered:** The framework has 6 independent systems that were identified during decomposition, but none have standalone design docs explaining what they are, why they exist, which principles they embody, and how they compose with each other.

**Why it matters:** Without design docs, someone looking at the framework sees files but doesn't understand the design intent. These docs make the "composable not monolithic" (P1) principle concrete — each system should make sense alone.

**What was tried:** docs/design-principles.md captures the governing principles. docs/structure.md captures the layout. docs/execution-strategies.md captures the two modes. But no doc explains an individual system's design rationale.

**Constraints:**
- Each doc ~1 page (P8: Lightning-Quick)
- Each self-contained (P1: Composable)
- Each references at least one design principle
- Goes in orca-context/designs/ (project-specific, since these describe the design of this framework)

## The 6 Systems

1. **The Seed** — Working style principles (framework/seed.md). Why a seed and not rules? How it composes with CLAUDE.md.
2. **The Knowledge Convention** — orca-context/knowledge/ pattern. One file per learning, append-only. Why files not a database?
3. **The PRD Format** — Task definitions. Why JSON? What fields matter? How signoff gates work.
4. **The State System** — Task states (pending, in_progress, complete, blocked, needs_human_review, redo). How state transitions work. The ephemeral (.orca-tasks/) vs durable (orca-context/tasks/) distinction.
5. **Role Definitions** — How roles are written (principles not prescriptions, ~1 page, what they DO and DON'T). Why broad roles not narrow specialists.
6. **The Orchestrator Pattern** — Orca dispatches, doesn't implement. Why subagents not direct execution. How the build cycle works.
