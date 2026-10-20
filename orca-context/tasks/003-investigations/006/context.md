# Task Context: Human-Blocking and Task Parking Mechanism

## Problem Statement

**Discovered:** During task execution, orca may encounter situations where proceeding without human input would cause harm — breaking architectural decisions, making irreversible changes based on assumptions, or choosing between approaches that only the human can evaluate. Currently there's no structured way to say "I'm stuck, I need you, but I'll keep working on other things."

**Why it matters:** Without this mechanism, orca either (a) guesses and potentially breaks things, (b) stops entirely and wastes time on tasks it COULD be doing, or (c) produces work that needs complete rework because it made the wrong assumption. The human-blocking pattern is the difference between orca being a useful autonomous agent and a risky one.

**What was tried:** The state system has `needs_human_review` for completed deliverables (003/003 investigates surfacing those). But that's for FINISHED work, not for runtime blocking. There's no equivalent of "I'm mid-task, I have a specific question, and I need an answer before I can continue safely."

**Constraints:**
- The filesystem is the interface — no orca-specific API required
- A web companion should be able to discover pending questions by scanning the filesystem
- The blocking artifact must contain everything needed to understand the question and respond (self-contained)
- The mechanism must support orca continuing to parallelize other tasks while one is parked
- When the human responds, the parked task should be resumable with full context
- Must not require the human to be online — the question can wait, other work continues

## Design Considerations

### What Gets Written When Blocked

The "I need help" artifact should contain:
- What task was being worked on (PRD, task ID)
- What the agent was trying to do when it got stuck
- Why it can't proceed (the specific decision/input needed)
- What options it sees (if any)
- What will happen if it guesses wrong (the risk)
- Enough context that the human doesn't need to re-read the whole task

### Where It Gets Written

Options to investigate:
- A dedicated directory (`orca-context/blocked/` or `.orca-tasks/blocked/`)
- Within the task's own directory (`.orca-tasks/<prd>/<task>/blocked.md`)
- A centralized queue file (single file with all pending questions)

### How Orca Knows to Skip It

- Task status could transition to `blocked_on_human` or similar
- Orca checks for blocking artifacts before attempting a task
- Parked tasks don't count as "in progress" for parallelization limits

### How a Web Companion Discovers Questions

- The companion needs to find all pending questions without knowing orca's internals
- Filesystem scanning with a known convention (file name, directory, or metadata)
- The format should be human-readable AND machine-parseable (markdown with structured frontmatter?)

### How Work Resumes

- Human writes a response (in the artifact? in a separate file? via web companion?)
- Orca detects the response on next check
- The response + original context is enough to continue the task

## Nicole's Vision

"Eventually, what I want to happen, is to have a web companion that will make these available, the human can answer, hopefully before other parallel tasks are exhausted, and then work can resume. But I want the underlying file system to support this in a native and loosely-coupled, tightly cohesive manner."

This tells us: the filesystem design is PRIMARY, the web companion is SECONDARY. Get the filesystem right and the web companion becomes a thin UI layer on top.
