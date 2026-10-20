# Exploration: Install Process & Framework Structure

## Current install.sh — What It Does

File: `/workspace/install.sh` (225 lines)

The script takes a target project path as an argument and copies files from several locations in the orca repo. It has basic idempotency (skips unchanged files, backs up changed ones) and prints a summary of what it did.

### What it copies (10 steps):

1. `templates/CLAUDE.md.template` -> `CLAUDE.md` (only if absent)
2. `templates/progress.txt.template` -> `progress.txt` (only if absent)
3. `templates/.claudeignore` -> `.claudeignore`
4. `templates/.git-hooks/pre-push` -> `.git-hooks/pre-push` + configures `core.hooksPath`
5. `ORCA_PROMPT.md` -> `ORCA_PROMPT.md` (bash-loop mode instructions)
6. `orca-loop.sh`, `orca-once.sh` (bash-loop runner scripts)
7. `templates/UI_TESTING.md` -> `UI_TESTING.md`
8. `prds/PRD_TEMPLATE.json`, `prds/PRD_REFINE.md` -> `prds/`
9. `.claude/skills/discover/SKILL.md`, `.claude/skills/refine/SKILL.md` -> `.claude/skills/`
10. Appends `orca-logs/` to `.gitignore`

### What it does NOT do:

- Does **not** copy `framework/` -> `.orca/` at all. This is the biggest gap.
- Does **not** set up `orca-context/` structure.
- Does **not** copy the `/orca` skill (`.claude/skills/orca/SKILL.md`).
- Does **not** install `framework/perspectives/`, `framework/processes/`, `framework/orca.md`, `framework/seed.md`, or `framework/templates/prd.json`.

## framework/ Directory — What Should Be Installed

Source: `/workspace/framework/` (canonical). Destination: `.orca/` (installed copy).

### Current framework/ contents:

```
framework/
  seed.md                     # Working principles — framework entry point
  orca.md                    # Task supervisor / orchestrator instructions
  perspectives/
    architect.md              # How to think structurally
    code-cleaner.md           # Fix issues directly, no kickback
    code-reviewer.md          # (exists but may be superseded by code-cleaner)
    design-reviewer.md        # Evaluate designs
    explorer.md               # Trace codebases
    planner.md                # Pipeline planning
    spec-reviewer.md          # Evaluate specs
  processes/
    build-cycle.md            # Standard task cycle
    prd.md                    # PRD process (pipeline model, states, splitting)
  roles/                      # OLD — should be removed (task 005)
    architect.md
    code-reviewer.md
    design-reviewer.md
    spec-reviewer.md
  templates/
    prd.json                  # PRD template
```

### Currently installed .orca/ contents:

```
.orca/
  seed.md
  orca.md
  perspectives/               # All 7 perspectives present
  processes/
    build-cycle.md
    prd.md
  templates/
    prd.json
```

The `.orca/` directory is correctly synced from `framework/` (minus the stale `roles/` directory, which is correctly excluded from `.orca/`).

## Framework/Installed Boundary (from CLAUDE.md + bootstrap plan)

### Goes into `.orca/` (installed into target projects):
- `seed.md` — Working principles + framework navigation
- `orca.md` — Orchestrator instructions
- `perspectives/` — All perspective files
- `processes/` — build-cycle.md, prd.md
- `templates/` — prd.json

### Stays in orca only:
- `docs/` — Framework design documentation
- `CLAUDE.md` — The orca project's own CLAUDE.md
- `orca-context/` — Orca's own project context
- Docker/bash scripts — `Dockerfile`, `orca-start.sh`, `orca-loop.sh`, `orca-once.sh`, `orca-clone.sh`, `orca-reset.sh`
- `install.sh` — The install script itself
- `templates/` — Source templates for install (CLAUDE.md.template, etc.)
- `prds/` — Old PRD location (pre-framework PRDs, now in orca-context/prds/)
- `ORCA_PROMPT.md` — Bash-loop mode thin wrapper
- `framework/roles/` — Stale, to be removed

## What a New Project Needs

### Minimum viable installation:

1. **`.orca/` directory** — Full copy of framework/:
   - `seed.md`, `orca.md`
   - `perspectives/` (all .md files)
   - `processes/` (build-cycle.md, prd.md)
   - `templates/prd.json`

2. **`CLAUDE.md`** — From template, with the key line: `Read .orca/seed.md before starting any task.`

3. **`.claude/skills/`** — At minimum:
   - `orca/SKILL.md` — The `/orca` command (subagent mode)
   - `discover/SKILL.md` — The `/discover` command (project discovery)
   - `refine/SKILL.md` — The `/refine` command (PRD refinement)

4. **`orca-context/` scaffold**:
   ```
   orca-context/
     overrides/           # For project-specific framework additions
     knowledge/           # Accumulated learnings
     prds/                # PRD files
     designs/             # Design documents
     tasks/               # Per-task durable context
   ```

5. **`.gitignore` additions**:
   - `.orca-tasks/*/debug-*`, `.orca-tasks/*/scratch-*` (ephemeral agent files)
   - `orca-logs/` (if using bash loop mode)

6. **`.git-hooks/pre-push`** + `core.hooksPath` config — Safety guard against pushing to main

7. **`.claudeignore`** — Excludes secrets, lock files, build outputs from Claude context

### Optional (bash-loop mode only):
- `ORCA_PROMPT.md` — Bash-loop instructions
- `orca-loop.sh`, `orca-once.sh` — Runner scripts

### Should NOT be installed (currently installed by install.sh):
- `progress.txt` — Old bash-loop artifact. In the new framework, progress is tracked in `.orca-tasks/<prd>/<task>/progress.txt` per-task, not a single root file.
- `UI_TESTING.md` — Project-specific testing guidance; not framework material. A project that needs it can create its own.
- `prds/PRD_TEMPLATE.json` (old location) — The template now lives in `framework/templates/prd.json` (installed to `.orca/templates/prd.json`).
- `prds/PRD_REFINE.md` (old location) — The refine skill at `.claude/skills/refine/SKILL.md` now handles this.

## Skills Analysis

### `.claude/skills/orca/SKILL.md`
Points to `.orca/orca.md`. This is the primary entry point for subagent mode. **Not currently installed by install.sh** — critical gap.

### `.claude/skills/discover/SKILL.md`
Project discovery tool. Populates CLAUDE.md with tech stack, patterns, testing setup. Installed by install.sh. Should continue to be installed.

### `.claude/skills/refine/SKILL.md`
PRD refinement tool. Reviews task sizing and acceptance criteria. Installed by install.sh. Should continue to be installed.

## What's Broken/Stale in install.sh

### Critical gaps (things it should do but doesn't):

1. **Does not install `.orca/` at all.** The entire framework (seed.md, orca.md, perspectives/, processes/, templates/) is missing from the install. This is the single biggest failure — the framework literally doesn't get installed.

2. **Does not install `/orca` skill.** Without `.claude/skills/orca/SKILL.md`, users can't run `/orca` to start PRD execution in subagent mode.

3. **Does not create `orca-context/` structure.** New projects have nowhere to put PRDs, designs, or task context.

### Stale artifacts (things it installs that are outdated):

4. **`progress.txt`** — Root-level progress file is an old bash-loop concept. Replaced by per-task progress in `.orca-tasks/`.

5. **`UI_TESTING.md`** — Not framework material. Project-specific.

6. **`prds/PRD_TEMPLATE.json`** and **`prds/PRD_REFINE.md`** — Old locations. Template is now at `.orca/templates/prd.json`. Refine is now the `/refine` skill.

7. **`ORCA_PROMPT.md` + `orca-loop.sh` + `orca-once.sh`** — These are bash-loop mode only. They work for that mode, but install.sh doesn't distinguish modes. A subagent-mode-only user gets files they don't need.

### Structural issues:

8. **`templates/CLAUDE.md.template`** is outdated — references `README.md Step 3.4` and has npm-specific commands. The template should guide users to `.orca/seed.md` and `/discover`.

9. **The old PRD template** (`prds/PRD_TEMPLATE.json`) uses `testsPassing` field, `sprint`/`overview` keys. The current framework uses `pipeline`, `outcome`, `verification`, `status` fields (see `framework/templates/prd.json`).

10. **`prds/PRD_REFINE.md`** is a 230-line document that duplicates the `/refine` skill. Confusing to have both.

11. **The overrides directory** at `orca-context/overrides/roles/` references the old `roles/` structure. Should be `overrides/perspectives/` (or just generic `overrides/`).

### Missing from install experience:

12. **No explanation of what was set up.** The "Next steps" section tells you to run `/discover` but doesn't explain the framework structure, what `.orca/` is, or how to start using it.

13. **No agentic context.** An agent running install gets colored terminal output (ANSI codes) and no structured understanding of what happened.

## Summary for Architect

The current install.sh is a relic of the pre-bootstrap framework. It copies files from locations that have been reorganized (`templates/`, `prds/`) and misses the core framework directory (`framework/` -> `.orca/`) entirely. A new install process needs to:

1. Copy `framework/*` -> `.orca/` (the actual framework)
2. Set up `.claude/skills/` (orca, discover, refine)
3. Scaffold `orca-context/` for the target project
4. Create a CLAUDE.md that points to `.orca/seed.md`
5. Set up git safety hooks
6. Set up `.claudeignore`
7. Optionally install bash-loop mode files
8. Provide clear post-install guidance for both humans and agents
9. Clean up or not install stale artifacts (progress.txt, UI_TESTING.md, old PRD locations)
