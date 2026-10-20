# Task Context: AGENTS.md Pattern Investigation

## Problem Statement

**Discovered:** AI coding tools can accumulate per-directory knowledge via AGENTS.md files. But the balance is tricky — too liberal creates noise (write after every change), too conservative loses knowledge (never capture anything).

**Why it matters:** This is a framework-level concern. Every project using orca could benefit from per-directory context, but we don't have good guidance on when/what to write.

**What was tried:** docs/structure.md has a brief section noting AGENTS.md as an open question. CLAUDE.md in orca mentions it. No systematic investigation of what works in practice.

**Constraints:**
- This is an investigation, not implementation — produce findings document
- The findings will influence framework design, so they need human review first
- Should look at real usage patterns, not just theory

## Questions to Answer

- What triggers an AGENTS.md write? (Every code change? Only structural changes? Only when learning something non-obvious?)
- What content is useful vs noise? (File descriptions? API patterns? Gotchas? Testing conventions?)
- How to prevent staleness? (AGENTS.md that describe deleted code is worse than no AGENTS.md)
- Where in the framework should guidance live? (Process doc? Seed principle? Role instruction?)
