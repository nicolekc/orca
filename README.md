# Orca Framework

Composable tools for AI-assisted software development. Six independent pieces that prevent the death spiral of AI-assisted product development — use all of them, or just one.

See [WHY.md](WHY.md) for the motivation and design philosophy.

## Quick Start

### Install into your project

```bash
git clone https://github.com/nicolekc/orca.git ~/orca
~/orca/install.sh ~/projects/my-app
```

This installs:
- `.orca/` — Framework core (perspectives, processes, seed, templates)
- `.claude/skills/` — `/orca`, `/discover`, `/refine` skills
- `orca-context/` — Scaffold for project-specific context
- `CLAUDE.md` — Project context file (populate with `/discover`)
- `.claudeignore`, `.git-hooks/pre-push`, `.gitignore` additions

### Set up project context

```bash
cd ~/projects/my-app
claude
> /discover
```

This explores your project and populates CLAUDE.md with tech stack, patterns, and testing setup.

### Create a PRD

Write a PRD or have Claude help you create one:

```
Create a PRD for [describe your feature].
Save it to orca-context/prds/001-feature-name.json
```

Refine it with `/refine orca-context/prds/001-feature-name.json`.

### Run Orca

```
/orca orca-context/prds/001-feature-name.json
```

Orca reads the PRD, dispatches subagents to work through task pipelines, and pushes when done. Each task flows through a pipeline of perspectives (planner, architect, implementer, code-cleaner, etc.) — each one a subagent with clean context.

## How It Works

### The Pipeline Model

Every PRD task has a pipeline — an ordered list of perspectives that process it:

```json
{
  "id": "001",
  "description": "Add user authentication",
  "outcome": "Users can log in with email/password",
  "verification": "Login flow works end-to-end, tests pass",
  "status": "in_progress",
  "pipeline": [
    {"role": "architect", "status": "complete"},
    {"role": "implementer", "status": "in_progress"},
    {"role": "code-cleaner", "status": "pending"}
  ]
}
```

The planner decides which perspectives a task needs. The orchestrator walks the pipeline. Each step is a subagent with clean context that does one thing and pushes.

### Perspectives

Different lenses on the same work. Each perspective reads `.orca/perspectives/<name>.md` for its instructions:

| Perspective | What it does |
|-------------|--------------|
| **planner** | Reads a task, decides which perspectives process it, writes the pipeline |
| **architect** | Analyzes the system, designs approaches, may split tasks |
| **implementer** | Writes code, runs tests, commits |
| **code-cleaner** | Applies code review principles to make fixes directly |
| **design-reviewer** | Catches structural problems in designs early |
| **spec-reviewer** | Catches specification problems before implementation |
| **explorer** | Maps codebases before modification |

### The PRD Format

PRDs define tasks with outcomes and verification — not step-by-step instructions:

```json
{
  "name": "Feature Name",
  "description": "What this PRD accomplishes",
  "signoff": "full",
  "tasks": [
    {
      "id": "001",
      "description": "What needs to happen and why",
      "outcome": "What done looks like",
      "verification": "How to prove it works",
      "dependencies": [],
      "status": "pending",
      "pipeline": []
    }
  ]
}
```

See `.orca/templates/prd.json` for the template.

### Durable Context

Each task can accumulate context in `orca-context/tasks/<prd-name>/<task-id>/`. Research notes, design decisions, investigation results — anything the next perspective needs. This is how knowledge persists across the pipeline.

## Execution Modes

### Subagent Mode (primary)

For interactive Claude Code sessions. Run `/orca <prd-path>`. Orca dispatches subagents, each handling one pipeline step for one task.

### Bash Loop Mode (Docker)

For headless execution. Install with `--bash-loop` flag, then run inside a Docker container:

```bash
./orca-loop.sh orca-context/prds/001-feature.json 20
```

Each iteration reads `ORCA_PROMPT.md` (a thin wrapper around `.orca/orca.md`) and completes one pipeline step.

## Containers: the `orca` command

Each project runs in its own container, with its own home (logins, Claude memory, settings) kept on the Mac in `~/.orca/projects/<project>/home`. The `orca` command manages them from the Mac.

```bash
curl -fsSL https://raw.githubusercontent.com/nicolekc/orca/main/cli/install.sh | bash
orca update        # get the image (and later, newer orca and images)
orca               # pick a project and start it
```

`orca serve` (a dashboard of every project, forward and Claude session), `orca start [folder]`, `orca new <name>`, `orca list`, `orca delete <project>`, `orca forward <port>` (reach a server in the container at `http://<port>.<project>.localhost:7320`), `orca update`: see `orca --help`. Working on it: `make help` (source in `cli/`).

Each `orca start` opens a terminal in the project's container: a tmux session that keeps running when its window closes, so a project can have any number of chats going at once. Everything orca adds to a container, at creation and every time it runs, is listed in [container-features.md](container-features.md).

## Repository Structure

This repo is **self-hosting** — the framework is installed into itself for development.

| Directory | Purpose |
|-----------|---------|
| `framework/` | **Source** of framework files. All edits go here. |
| `.orca/` | **Installed copy** of `framework/`. Never edit directly. |
| `orca-context/` | Project-specific context (overrides, knowledge, PRDs, designs, tasks) |
| `.orca-tasks/` | Ephemeral agent workspaces (disposable after merge) |
| `docs/` | Framework design documentation |
| `.claude/skills/` | Claude Code skills (`/orca`, `/discover`, `/refine`) |
| `templates/` | Install templates (CLAUDE.md.template, .claudeignore, .git-hooks) |

### Key Files

| File | Purpose |
|------|---------|
| `.orca/seed.md` | Working style principles — read before any task |
| `.orca/orca.md` | Orchestrator instructions |
| `.orca/processes/prd.md` | Pipeline model and task lifecycle |
| `install.sh` | Installs the framework into a target project |
| `ORCA_PROMPT.md` | Bash-loop mode instructions (thin wrapper around orca.md) |

## Design Principles

The framework is governed by [11 design principles](docs/design-principles.md). The key ones:

- **Composable, Not Monolithic** — Each piece is useful alone. No piece requires any other.
- **Principles Over Prescriptions** — State principles, trust the executor. Don't pre-empt with rigid rules.
- **The Specification-Creativity Tradeoff** — More detail in task specs produces worse results. Give context and trust, not step-by-step instructions.

## Git Workflow

- One branch per PRD: `orca/<prd-name>`
- One PR per PRD, created after the first completed pipeline step
- The PR evolves with each push — it's a living dashboard of progress
- Never push to main directly
