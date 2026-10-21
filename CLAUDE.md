# Orca Framework

This repo is the Orca agent framework — composable tools for AI-assisted software development. It is also self-hosting: the framework is installed into itself for development.

## Orca Framework

Read `.orca/seed.md` before starting any task.

## What This Repo Contains

- `framework/` — **Source** of framework files (perspectives, processes, seed, templates). This is the canonical version. **ALL edits to framework files go here.**
- `.orca/` — **Installed copy** of `framework/`. **NEVER edit .orca/ directly** — edit in `framework/` and sync.
- `orca-context/` — Project-specific context (overrides, knowledge, designs, PRDs, durable task context)
- `.orca-tasks/` — Ephemeral per-task agent workspaces (disposable after merge)
- `docs/` — Framework design documentation
- `.claude/skills/` — Claude Code skills (`/orca`, `/discover`, `/refine`)
- Docker/bash infrastructure — `Dockerfile`, `orca-start.sh`, `orca-loop.sh`, etc.
- `orca-context/designs/open-questions.md` — Postponed design decisions (container setup, tools). Check before changing the related area.
- `BACKLOG.json` — Pre-PRD backlog: future improvements, unsolved problems, and working knowledge from real project use. Check before starting framework evolution work.

## Framework / Installed Boundary

**Installed into target projects** (via `.orca/`): `seed.md`, `perspectives/`, `orca.md`, `processes/`, `templates/`

**Stays in the orca repo only**: `docs/`, `CLAUDE.md`, `orca-context/`, Docker/bash scripts

## Essential Reading

1. **`docs/design-principles.md`** — 11 principles governing all framework design. Key ones:
   - **P2 (Principles Over Prescriptions)** — State principles, trust the executor
   - **P3 (Specification-Creativity Tradeoff)** — Over-specifying REDUCES quality
   - **P8 (Lightning-Quick Descriptions)** — Every file costs tokens. Be minimal.

2. **`docs/structure.md`** — How framework files are organized
3. **`docs/execution-strategies.md`** — Subagent and bash loop modes

## Framework Design Anti-Patterns

From analysis of OMC, Superpowers, and Gas Town:

- **Prescriptiveness trap**: More rules → more corner cases → more patches → complexity explosion
- **Anti-rationalization tables**: Adversarial arms race. Trust and correct after, don't pre-empt.
- **Over-classification of roles**: 30 agent types creates a routing problem. Keep roles broad.
- **Custom vocabulary**: Invented terminology wastes tokens and confuses.
- **Mandatory activation**: Let the AI decide what applies.

## Git Rules

- NEVER push to main directly
- Always work on feature branches
- Small, logical commits with clear messages

## How to Run /orca

```
/orca orca-context/prds/001-foundation.json
```

Orca reads the PRD, dispatches subagents to work through task pipelines, and pushes when done.

## Key Knowledge Files

Knowledge files live in `orca-context/knowledge/` (one file per learning, append-only). Currently empty — learnings from earlier PRDs are in their respective `orca-context/tasks/` directories.
