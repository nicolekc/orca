# Task Context: Update install.sh

## Problem Statement

**Discovered:** The current install.sh copies old-style files (ORCA_PROMPT.md at repo root, etc.) that no longer match the framework structure. The framework has been reorganized into framework/ → .orca/ with perspectives/, processes/, templates/ subdirectories, plus orca-context/ and .orca-tasks/ conventions.

**Why it matters:** install.sh is how other projects adopt the framework. If it's broken, nobody can use orca-docker. It's also how the self-hosting works (orca-docker installs into itself).

**What was tried:** The current install.sh was written for the original flat structure. It needs a complete rewrite for the new directory layout.

**Constraints:**
- Backward compatibility with the old layout is NOT required (only Promptly used it, and Promptly will be updated separately)
- Self-installation (when the target IS orca-docker) must not create circular copies — framework/ is the source, .orca/ is the installed copy
- The existing PRD_REFINE.md content is valuable and should be preserved somewhere in the framework
- Must create: .orca/ (from framework/), orca-context/ (bare structure with overrides/, knowledge/, prds/, designs/, tasks/), .orca-tasks/ (empty, agents create during execution), .claude/skills/ (orca, discover, refine)

## Self-Installation Edge Case

When orca-docker installs into itself:
- framework/ already exists (it's the source)
- .orca/ should be a copy of framework/
- orca-context/ and .orca-tasks/ already exist (they're being used for development)
- The script should detect self-install and skip creating things that already exist with project-specific content

## Files to Reference

- Current install.sh (read it first to understand what exists)
- docs/structure.md (the target layout)
- framework/ directory tree (the source to copy)
- .claude/skills/ directory (skills to copy)
