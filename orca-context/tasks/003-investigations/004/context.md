# Task Context: Parallelization Principles

## Problem Statement

**Discovered:** Orca can dispatch independent tasks in parallel (build-cycle.md mentions this, orca.md says "unless tasks are explicitly independent"). But what makes tasks actually safe to parallelize?

**Why it matters:** Parallelization is a major efficiency gain but risky if not done carefully. Two tasks modifying the same file, or one task breaking tests another depends on, can create hard-to-debug merge issues.

**What was tried:** build-cycle.md has a brief "Parallel Tasks" section: "If tasks are independent (no shared files, no dependency relationship), they can run through the cycle in parallel." orca.md says to dispatch separate subagent chains. But this is guidance, not guardrails.

**Constraints:**
- Should be informed by real experience from PRD 002 (core loop validation) if available
- Investigation tasks (non-code, read-only) are inherently safe to parallelize
- Code tasks that touch different files/modules are probably safe
- Code tasks that touch shared infrastructure (tests, configs, types) are risky
- This should produce guidelines, not automation — orca is a prompt, not a program
