# Task Context: Legacy Artifact Cleanup

## Problem Statement

**Discovered:** The repo has files from the old flat layout that predate the framework restructure. These create confusion about what's current and what's dead.

**Why it matters:** Legacy artifacts mislead both humans and AI agents. An agent reading `templates/CLAUDE.md.template` or `.claude/skills/refine/SKILL.md` will follow outdated patterns (old PRD format with `testsPassing`, old file paths like `ORCA_PROMPT.md`). This undermines the framework's own quality.

**What was tried:** The framework was restructured into `framework/` with perspectives, processes, templates subdirectories. But the old files were never cleaned up.

**Constraints:**
- Don't lose valuable content — audit before deleting
- The `/refine` skill has useful guidance about task sizing and acceptance criteria quality, but its PRD format references are stale
- Root `templates/` may have content worth preserving in `framework/templates/` or elsewhere
- This is cleanup, not redesign — keep it focused

## Known Legacy Artifacts

1. **`templates/` (root)** — Pre-restructure templates:
   - `.claudeignore` — may have useful ignore patterns
   - `CLAUDE.md.template` — old CLAUDE.md template
   - `UI_TESTING.md` — UI testing guidance (possibly valuable, possibly Promptly-specific)
   - `progress.txt.template` — old progress file template
   - `.git-hooks/` — git hooks directory

2. **`.claude/skills/refine/SKILL.md`** — References old PRD format:
   - Mentions `testsPassing: true/false` (not in current PRD format)
   - Doesn't reference the success-criteria-format.md patterns
   - Doesn't reference the problem-statement-structure.md patterns
   - The task sizing guidance is still good, just needs updating for current conventions

## For Each Artifact, Decide

- **Keep as-is**: Still correct and in the right place
- **Migrate**: Valuable content, wrong location — move to framework/ or orca-context/
- **Update**: Right location, stale content — refresh for current conventions
- **Remove**: No longer needed, content is elsewhere or obsolete
