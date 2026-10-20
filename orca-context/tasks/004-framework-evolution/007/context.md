# Task Context: Install/Onboarding Process

## Problem Statement

**Discovered:** PRD 001/002 covers the mechanical update of install.sh for the new directory layout. But there's no clear onboarding experience — what a new user runs, what they see, and what partial adoption looks like.

**Why it matters:** The install script is necessary but not sufficient. A good onboarding experience is what makes the difference between "technically works" and "someone would actually adopt this."

**Constraints:**
- This task is broader than PRD 001/002 — it covers the experience, not just the script
- Should be informed by the naming/organization audit (003/008) for directory names and structure
- Partial adoption is a real use case: someone might want roles and PRD format but not the orchestrator

## Design Questions

- Should the install be a script, a CLI command, or something else?
- What's the minimal install for partial adoption?
- What does the post-install experience look like (what does the user do next)?
