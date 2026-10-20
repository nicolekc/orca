# Task Context: Branch/Push Hygiene

## Problem Statement

**Discovered:** Orca needs clear conventions for git operations during PRD execution, but these haven't been validated in practice.

**Why it matters:** Without clear conventions, orca might create messy git history, name branches inconsistently, or fail to push correctly.

**What was tried:** framework/orca.md has a "Branch and Push Hygiene" section with initial guidance: create feature branch per PRD execution, small logical commits, push when done, retry with exponential backoff.

**Constraints:**
- Keep it simple — one branch per PRD execution is probably enough
- Push retry: 4 retries with exponential backoff (2s, 4s, 8s, 16s) — already in orca.md
- Nicole only runs `--dangerously-skip-permissions` inside Docker, which affects how git auth works
- Need to handle: what if the branch already exists? What about concurrent PRD executions?
