# Approach: New Install Process

## Design Decision: Keep It a Bash Script

The bootstrap plan floated "natural language description of end-state, not a script." I disagree for this context. A bash script is the right tool because:

- **Human invocation**: `./install.sh /path/to/project` is the universal CLI pattern. No dependencies, no build step, nothing to install first.
- **Agentic invocation**: An agent can run a bash script and parse its stdout. An agent can also read the script to understand what it does.
- **Idempotency**: Bash `cp`, `mkdir -p`, file comparison -- these are trivially idempotent. The current script already has this pattern; it just copies the wrong things.
- **No framework needed to install the framework**: If install required Claude or another AI, you'd have a chicken-and-egg problem.

The problem with the current install.sh is not that it's a bash script. It's that it copies the wrong files. The fix is to rewrite the script's content, not change its form.

## What the Installer Does

### Core (always installed):

1. **`.orca/` directory** -- Copy `framework/` contents to `.orca/` in the target project. Exclude `framework/roles/` (stale). This is the actual framework.

2. **`.claude/skills/`** -- Copy all three skills:
   - `orca/SKILL.md` -- The `/orca` command (subagent PRD execution)
   - `discover/SKILL.md` -- The `/discover` command (project discovery)
   - `refine/SKILL.md` -- The `/refine` command (PRD refinement)

3. **`orca-context/` scaffold** -- Create the directory structure with `.gitkeep` files so git tracks the empty dirs:
   ```
   orca-context/
     overrides/
     knowledge/
     prds/
     designs/
     tasks/
   ```
   Only create if `orca-context/` doesn't already exist. If it exists, leave it alone -- the project has already been set up.

4. **`CLAUDE.md`** -- Only if absent. Create from a new template that:
   - Has the framework entry point line: `Read .orca/seed.md before starting any task.`
   - Has a `## Project Details` section with a note to run `/discover`
   - Has a `## Git Rules` section with the standard rules
   - Does NOT have npm-specific commands or references to README.md Step 3.4
   - Is minimal -- `/discover` fills in the project-specific details

5. **`.claudeignore`** -- Copy from `templates/.claudeignore`. Overwrite if present (framework-managed file).

6. **`.git-hooks/pre-push`** -- Copy from `templates/.git-hooks/pre-push`. Set executable. Configure `core.hooksPath`.

7. **`.gitignore` additions** -- Append orca-specific entries if not already present:
   - `.orca-tasks/*/debug-*`
   - `.orca-tasks/*/scratch-*`
   - `orca-logs/`

### Optional (bash-loop mode):

8. **Bash-loop files** -- Only when invoked with a `--bash-loop` flag:
   - `ORCA_PROMPT.md`
   - `orca-loop.sh`, `orca-once.sh` (set executable)

   Without the flag, these are not installed. Subagent mode (the `/orca` skill) is the default and needs no extra files beyond what core installs.

### NOT installed (removed from current script):

- `progress.txt` -- Old concept. Per-task progress lives in `.orca-tasks/`.
- `UI_TESTING.md` -- Project-specific, not framework.
- `prds/PRD_TEMPLATE.json` -- Template is now at `.orca/templates/prd.json`.
- `prds/PRD_REFINE.md` -- Replaced by `/refine` skill.

## Self-Install Detection

When the target directory IS the orca-docker repo (detected by checking for `framework/` directory in target), the installer should:
- Still copy `framework/` -> `.orca/` (this is the sync mechanism)
- Skip `orca-context/` scaffold (already exists)
- Skip CLAUDE.md creation (already exists and is project-specific)
- Still update skills, hooks, claudeignore, gitignore

The simplest detection: if `$TARGET_DIR/framework/` exists AND `$TARGET_DIR/CLAUDE.md` already mentions "orca-docker" or "Orca Framework", treat it as self-install. But honestly, the existing idempotency logic (skip if present and unchanged, update if different) handles most of this naturally. The only special case is `orca-context/` -- which already has the "only create if absent" guard.

Actually, on reflection: no special self-install logic needed. The "create only if absent" and "update if different" patterns handle every case. The self-install scenario just means more files get the "skipped (unchanged)" treatment. Keep it simple.

## Update Behavior (Fresh Install vs Update)

The script already has good idempotency patterns. Keep them:
- **`.orca/` directory**: Always overwrite. This is framework-managed. On update, the user gets the latest framework.
- **`CLAUDE.md`**: Only create if absent. Never overwrite -- the user has customized it.
- **`orca-context/`**: Only create scaffold if absent. Never touch existing content.
- **Skills**: Always overwrite. Framework-managed.
- **`.claudeignore`**: Always overwrite. Framework-managed.
- **`.git-hooks/pre-push`**: Always overwrite. Framework-managed.
- **`.gitignore`**: Append-only. Never remove entries.
- **Bash-loop files**: Same as core -- overwrite if framework-managed, skip if user file.

The distinction: framework-managed files (`.orca/`, skills, hooks, claudeignore) get overwritten on update. User-owned files (CLAUDE.md, orca-context/) are created once and left alone.

## User Output

### For humans (default):

Clean, minimal output. No ANSI color -- it adds noise and doesn't help. Use plain text with clear structure:

```
Installing Orca framework to /path/to/project...

Created:
  + .orca/                    (framework core)
  + .claude/skills/orca/      (PRD execution)
  + .claude/skills/discover/   (project discovery)
  + .claude/skills/refine/     (PRD refinement)
  + orca-context/             (project context)
  + CLAUDE.md                  (project config -- run /discover to populate)
  + .claudeignore
  + .git-hooks/pre-push

Updated:
  ~ .gitignore                 (added orca entries)

Next steps:
  1. cd /path/to/project
  2. Run 'claude' and then '/discover' to set up project context
  3. Commit: git add -A && git commit -m 'Install Orca framework'
```

On update, "Created" items become "Updated" or "Unchanged":
```
Updated:
  ~ .orca/                    (framework updated)
  ~ .claude/skills/orca/      (updated)

Unchanged:
  = CLAUDE.md
  = orca-context/
  = .claudeignore
```

### For agents:

The same output works for agents. Plain text with clear structure is parseable by both humans and AI. No special `--json` flag or structured output needed. An agent reading the stdout understands what happened.

## Invocation

```bash
# Fresh install (subagent mode -- default)
./install.sh /path/to/project

# Fresh install with bash-loop mode files
./install.sh --bash-loop /path/to/project

# Update existing install
./install.sh /path/to/project
# (same command -- idempotent)
```

The script lives at the root of orca-docker. Users clone orca-docker, then run install pointing at their project. Same as today.

## Template for CLAUDE.md

The current `templates/CLAUDE.md.template` needs rewriting. New template:

```markdown
# Project Context

Read `.orca/seed.md` before starting any task.

## Commands
<!-- Run /discover to populate this section -->

## Git Rules
- NEVER push to main directly
- Always work on feature branches
- Small, logical commits with clear messages

## Project Details
<!-- Run /discover to populate this section -->
```

Minimal. The `/discover` skill fills in the real content. The template just sets up the framework entry point and the structure that `/discover` expects.

## What to Verify

After install on a fresh git repo:
1. `.orca/seed.md` exists and matches `framework/seed.md`
2. `.orca/perspectives/` has all perspective files
3. `.orca/processes/` has build-cycle.md and prd.md
4. `.orca/templates/prd.json` exists
5. `.orca/orca.md` exists
6. All three skills exist under `.claude/skills/`
7. `orca-context/` has the five subdirectories
8. `CLAUDE.md` exists with the seed.md reference
9. `.git-hooks/pre-push` is executable and `core.hooksPath` is set
10. `.claudeignore` exists
11. `.gitignore` has orca entries
12. `progress.txt`, `UI_TESTING.md`, `prds/` are NOT created
13. Running install again produces "Unchanged" for everything (idempotent)

## Key Decisions Summary

| Decision | Choice | Why |
|----------|--------|-----|
| Script vs declarative | Bash script | No dependencies, universal, already works |
| Bash-loop files | Opt-in via `--bash-loop` | Subagent mode is default; fewer files = less confusion |
| Output format | Plain text, no colors | Works for humans and agents equally |
| Self-install | No special logic | Idempotency handles it |
| Update behavior | Framework files overwrite, user files skip | Clear ownership boundary |
| CLAUDE.md template | Minimal with /discover hook | Template provides structure, /discover provides content |
| Old install.sh | Delete entirely | Replaced, not patched |
