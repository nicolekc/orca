# Project Structure

How the framework files are organized in a project that uses Orca.

## Two Directories

### `.orca/` — Framework Files (copied, don't edit)

Installed from the framework repo. Contains perspectives, processes, the seed, and templates. Treat as read-only. If the framework updates, these files get replaced.

```
.orca/
  seed.md                  # Working style principles
  seed-prd.md              # Working style for the PRD process
  orca.md                 # Orchestrator instructions
  oneshot.md               # Goal-directed build mode, no PRD
  perspectives/
    architect.md
    code-cleaner.md
    code-reviewer.md
    design-reviewer.md
    explorer.md
    implementer.md
    planner.md
    qa-engineer.md
    spec-reviewer.md
    ux-designer.md         # Routes user-facing work to the design skills
  processes/
    build-cycle.md
    prd.md                 # Pipeline model and task lifecycle
  templates/
    prd.json               # PRD template
  tools/
    semantic-search/       # Local search over a project's resources and scratch
```

### `orca-context/` — Project-Specific Files (your edits)

No dot — this is human-inspectable. Everything specific to this project. Starts nearly empty with bare templates. Grows as the project does.

```
orca-context/
  overrides/               # Additions to .orca/ (mirror the structure)
    perspectives/          # e.g., architect.md with project-specific context
  knowledge/               # One file per learning, append-only
  prds/                    # Durable: task definitions (PRD files)
  designs/                 # Durable: design documents, investigations
  tasks/                   # Durable per-task context (research, brain dumps, design notes)
    <prd-name>/
      <task-id>/
```

If an override needs to *subtract* from a framework file, that's a signal the framework file is too prescriptive. Fix the framework, don't hack the override.

### `orca-context/tasks/` — Durable Task Context

Task-specific context that humans prepare for agents or that emerges during design sessions. Research notes, brain dumps, design challenges, background material. This lives in `orca-context/` because it's human-inspectable and survives beyond task execution.

```
orca-context/tasks/
  <prd-name>/
    <task-id>/
      (research notes, design docs, brain dumps, etc.)
```

**What goes here:**
- Research or investigation notes prepared before task execution
- Design challenge documents with open questions
- Background material that gives the task implementer context beyond the PRD description
- Brain dumps from design sessions

### `.orca-tasks/` — Ephemeral Agent Workspaces (machinery)

Dot-prefixed — this is machinery, not for casual browsing. Created by agents during task execution. **Disposable after merge.**

```
.orca-tasks/
  <prd-name>/              # Scoped by PRD (task IDs restart per PRD)
    <task-id>/
      progress.txt         # Agent execution log (append-only)
      debug-*              # Debug traces (ephemeral)
      scratch-*            # Scratch files (ephemeral)
```

**What goes here:**
- `progress.txt` — agent execution log (what the agent tried, what worked, what failed)
- Debug traces or reproduction steps
- Scratch files created during implementation
- Anything the agent needs during execution but nobody needs after merge

**NOT what goes here:**
- Human-prepared context (goes in `orca-context/tasks/`)
- Design decisions (extract to `orca-context/designs/`)
- Reusable learnings (extract to `orca-context/knowledge/`)

### progress.txt Conventions

One `progress.txt` per task (not per role). Append-only, timestamped entries. Each entry records who did what and the result. Created by agents during execution, not pre-populated.

```
## [timestamp] Architect
Approach: [brief summary]
Key decisions: [what and why]

## [timestamp] Implementer
Changes: [files modified]
Tests: [pass/fail summary]
Committed: [hash]

## [timestamp] Reviewer (round 1)
Verdict: [approved / issues found]
Issues: [if any]
```

This creates a single narrative thread for the task. A future agent or human can read it top-to-bottom and understand what happened during execution.

## CLAUDE.md

The project's CLAUDE.md remains the primary project context file. The seed (`.orca/seed.md`) is a supplement, not a replacement. CLAUDE.md has project-specific commands, conventions, and context that the framework doesn't know about.

## Self-Installation

When the orca repo installs into itself:
- `framework/` is the **source** (canonical, edited by developers)
- `.orca/` is the **installed copy** (generated, overwritten on install)
- These are different directories — no conflict

## AGENTS.md Pattern

Projects can use `AGENTS.md` files in subdirectories to provide per-directory context to AI agents. These contain learnings, instructions, and conventions specific to the code in that directory. CLAUDE.md at the top level should instruct agents to read and write AGENTS.md files as they learn about the codebase.

The right balance for AGENTS.md writes is an open question — too liberal creates noise, too conservative loses knowledge. See the knowledge file on this topic if one exists.

## .gitignore Considerations

```
# Task workspace ephemeral files
.orca-tasks/*/*/debug-*
.orca-tasks/*/*/scratch-*

# Orca logs (if using the bash runner)
orca-logs/
```
