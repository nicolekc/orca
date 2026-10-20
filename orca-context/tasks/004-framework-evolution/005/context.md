# Task Context: Two Modes Design

## Problem Statement

**Discovered:** Orca's principles and tools are useful in two distinct modes, not just automated PRD execution. Nicole explicitly identified "enhanced vibe coding" as a real use case — interactive sessions where the framework's roles, knowledge, and seed enhance the human's workflow without orchestrating.

**Why it matters:** Most real development alternates between structured PRD execution and exploratory vibe coding. If the framework only supports PRD mode, it misses half the value.

**What was tried:** Initial thinking captured in two-modes.md co-located in this task's context folder. The framework files are already usable in both modes by design (they're "tools lying around"), but nothing makes this explicit.

**Constraints:**
- This task has "draft" status — Nicole wants to think about it more before it's ready
- The design should NOT require separate infrastructure for each mode
- Both modes should use the same framework files
- "Vibe coding" is Nicole's term for interactive AI-assisted development — don't overthink it, it's just "using Claude Code with orca's tools available"
