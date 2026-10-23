# Orca Framework

This repo is the Orca agent framework — composable tools for AI-assisted software development.

## What This Repo Contains

- `framework/` — the framework files (perspectives, processes, seed, templates), installed into projects as `.orca/`
- `.orca-tasks/` — Ephemeral per-task agent workspaces (disposable after merge)
- `docs/` — Framework design documentation
- `.claude/skills/` — Claude Code skills (`/orca`, `/discover`, `/refine`)
- `cli/` — the `orca` command (TypeScript, compiled with Bun) that runs on the Mac and manages project containers; `make help` lists its build and test tasks. `make check` runs every test that runs here (unit, React, browser); the Docker end-to-end tests (`cli/test/e2e/`) run in CI
- Docker/bash infrastructure — `Dockerfile`, `orca-migrate.sh`, `orca-loop.sh`, etc.
- `container-features.md` — everything orca adds to a project's container (at creation, and every time); keep it in step when adding one

## Framework / Installed Boundary

**Installed into target projects** (via `.orca/`): `seed.md`, `perspectives/`, `orca.md`, `processes/`, `templates/`

**Stays in the orca repo only**: `docs/`, `AGENTS.md`, `CLAUDE.md`, Docker/bash scripts

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

## Container Trust Boundary

Agents in project containers are treated as untrusted by the tooling on the Mac. Current guards, and why: containers see only their own home under `~/.orca` (so secrets there, like the dashboard token, stay out of reach); forwards are reachable from the Mac but not from other projects' containers; the `orca serve` dashboard listens on loopback and requires its token, with cross-site and DNS-rebinding checks, because containers and web pages can both reach the Mac's loopback. Change these when there's reason to, keeping the boundary in mind.

## Git Rules

- NEVER push to main directly
- Always work on feature branches
- Small, logical commits with clear messages
