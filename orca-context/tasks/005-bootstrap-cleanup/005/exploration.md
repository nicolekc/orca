# Task 005 Exploration: Old roles/ Structure Remnants

## Summary

The bootstrap created `framework/perspectives/` to replace `framework/roles/`, but `framework/roles/` was never deleted. The `.orca/roles/` directory was already removed (only `.orca/perspectives/` exists). Several files across the codebase still reference `roles/` in a framework context.

---

## 1. Old Directories

### `framework/roles/` -- EXISTS (should be deleted)

Contains 4 stale files:
- `framework/roles/architect.md`
- `framework/roles/code-reviewer.md`
- `framework/roles/design-reviewer.md`
- `framework/roles/spec-reviewer.md`

These are the old role files with mixed soft/hard skill content. The soft skills have been extracted into `framework/perspectives/` which now contains 7 files: architect.md, code-cleaner.md, code-reviewer.md, design-reviewer.md, explorer.md, planner.md, spec-reviewer.md.

### `.orca/roles/` -- ALREADY GONE

No action needed. The installed copy was cleaned up during bootstrap.

### `orca-context/overrides/roles/` -- EXISTS (contains only .gitkeep)

This is the project-specific overrides directory. It mirrors the old framework structure. Should be renamed to `orca-context/overrides/perspectives/` or removed if override structure is changing. Contains only a `.gitkeep` placeholder.

---

## 2. File References to `roles/` (Framework Context -- Need Update)

### `docs/structure.md` -- STALE (entire file describes old structure)

- Line 9: `"Contains roles, processes, the seed, and templates."` -- should say "perspectives"
- Lines 15-19: Shows `.orca/roles/` directory tree with architect.md, code-reviewer.md, design-reviewer.md, spec-reviewer.md -- should be `.orca/perspectives/` with current file list
- Line 33: Shows `orca-context/overrides/roles/` -- should be `overrides/perspectives/` (or whatever the new override structure is)

### `docs/design-principles.md`

- Line 55 (P6): `"Framework files (roles, processes, templates)"` -- should say "perspectives, processes, templates"

### `WHY.md`

- Line 70: `"Want PRDs + roles without the orchestrator? Three files."` -- should say "perspectives"

### `orca-context/tasks/001-foundation/002/context.md`

- Line 5: `"framework/ → .orca/ with roles/, processes/, templates/ subdirectories"` -- should say "perspectives/"

### `orca-context/tasks/002-core-loop/001/context.md`

- Line 9: `"orca.md → roles/ → processes/build-cycle.md"` -- should say "perspectives/"

### `orca-context/tasks/002-core-loop/002/context.md`

- Line 24: `"framework/roles/spec-reviewer.md — the enhanced spec reviewer role"` -- should say "framework/perspectives/spec-reviewer.md"

### `orca-context/tasks/001-foundation/003/context.md`

- Line 9: `"restructured into framework/ with roles, processes, templates subdirectories"` -- should say "perspectives"

---

## 3. References That Are Fine (Keep As-Is)

### `.orca/orca.md` and `framework/orca.md` -- KEEP

- Lines 10-24: Uses "roles" to mean pipeline roles (planner, architect, implementer, etc.) -- this is the pipeline concept, not the old `roles/` directory. The word "roles" here means "which perspective/role processes this pipeline step." This is correct usage.

### `.orca/processes/prd.md` and `framework/processes/prd.md` -- KEEP

- Line 7: `"Each step has a role and a status"` -- pipeline concept, not directory reference
- Line 28: `"which roles need to process it"` -- pipeline concept

### `CLAUDE.md` -- KEEP

- Line 41: `"Over-classification of roles"` -- this is discussing anti-patterns from framework research, not referencing a directory

### `orca-context/prds/005-bootstrap-cleanup.json` -- KEEP

- Lines 54, 66-68: These are task descriptions for THIS cleanup task -- they accurately describe what needs to happen

### `orca-context/prds/004-framework-evolution.json` -- KEEP

- References to "roles" in task descriptions discussing framework concepts, not old directory paths

### `orca-context/prds/003-investigations.json`

- Line 64: References `overrides/roles/` in the naming audit task description -- this is documenting what exists for investigation, fine to keep as historical context

### `orca-context/tasks/bootstrap/plan.md` -- KEEP

- Multiple references to `framework/roles/` -- this is a historical document describing what the bootstrap planned to do. It should remain as-is since it's durable context about the bootstrap's intent.

### `orca-context/tasks/003-investigations/008/context.md` -- KEEP

- Line 15: References `overrides/roles/` -- this is an investigation documenting current state

### `orca-context/tasks/004-framework-evolution/003/role-adaptation-notes.md` -- KEEP

- References to role files in the Gas Town repo (`internal/templates/roles/`) and conceptual role descriptions -- these reference external frameworks, not our directory structure

### `orca-context/tasks/004-framework-evolution/001/design-philosophy.md` -- KEEP

- Uses "roles" conceptually (e.g., "reviewer roles providing different perspectives")

### `orca-context/tasks/004-framework-evolution/001/frameworks-research.md` -- KEEP

- Uses "roles" when describing other frameworks (Gas Town's 8 roles, etc.)

### `orca-context/tasks/003-investigations/002/principle-adherence-risks.md` -- KEEP

- Uses "roles" conceptually ("Creating new roles, processes, or conventions")

### `docs/execution-strategies.md` -- KEEP

- No references to roles/

---

## 4. Action Items for Implementer

### Must Do
1. **Delete `framework/roles/`** -- entire directory (architect.md, code-reviewer.md, design-reviewer.md, spec-reviewer.md)
2. **Update `docs/structure.md`** -- replace `roles/` references with `perspectives/`, update file listing to match current perspectives directory
3. **Update `docs/design-principles.md` line 55** -- change "roles" to "perspectives" in P6 description
4. **Update `WHY.md` line 70** -- change "roles" to "perspectives"
5. **Rename `orca-context/overrides/roles/`** to `orca-context/overrides/perspectives/` (move the .gitkeep)

### Should Do (Stale Task Context)
6. **Update `orca-context/tasks/001-foundation/002/context.md` line 5** -- roles/ -> perspectives/
7. **Update `orca-context/tasks/002-core-loop/001/context.md` line 9** -- roles/ -> perspectives/
8. **Update `orca-context/tasks/002-core-loop/002/context.md` line 24** -- framework/roles/ -> framework/perspectives/
9. **Update `orca-context/tasks/001-foundation/003/context.md` line 9** -- roles -> perspectives

### Do NOT Touch
- `orca.md` / `prd.md` pipeline "role" references (correct conceptual usage)
- `CLAUDE.md` anti-pattern discussion (correct conceptual usage)
- `orca-context/tasks/bootstrap/plan.md` (historical document)
- Any references to roles in external framework analysis (Gas Town, etc.)
- PRD task descriptions that discuss this cleanup task itself
