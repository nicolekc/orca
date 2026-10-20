# Task Context: Test /orca End-to-End

## Problem Statement

**Discovered:** The /orca skill exists (.claude/skills/orca/SKILL.md) but has never been run. It dispatches subagents via the Task tool following the build cycle (architect → implement → review), but we don't know if it actually works.

**Why it matters:** /orca is the core mechanism of the framework. If it doesn't work, everything built on top of it is theoretical. This is the proof that the design actually functions.

**What was tried:** The skill was written based on the orca.md orchestrator prompt and the build cycle process. The prompts reference each other correctly in theory (orca.md → perspectives/ → processes/build-cycle.md), but no actual execution has been attempted.

**Constraints:**
- Create a dedicated test PRD with 2-3 small tasks — do NOT use the bootstrap PRDs, they're real work
- The test PRD should be designed to exercise specific mechanisms: happy path (task completes), circuit breaker (reviewer keeps rejecting), signoff gate (architecture-only stops after architect phase)
- Fix issues discovered during testing — this task includes both testing AND fixing

## What to Test

1. **Subagent dispatch**: Does orca correctly use the Task tool with role prompts? Does it include the right context for each subagent type?
2. **Build cycle flow**: Does architect → implement → review actually produce the right kind of output at each stage?
3. **Task state updates**: Does orca update task status in the PRD file as it progresses?
4. **Circuit breaker**: If the reviewer keeps finding issues, does it stop after 3 rounds and mark the task as blocked?
5. **Signoff gates**: Does "signoff": "architecture" stop after the architect phase?
6. **.orca-tasks/ population**: Does the agent create progress.txt during execution?

## Key Design Decisions Already Made

- Orca uses the Task tool (subagent mode), not bash execution
- Each subagent gets: its role prompt, the task description, any durable context from orca-context/tasks/
- Orca reads CLAUDE.md first for project context
- Non-code deliverables skip the implementer step
