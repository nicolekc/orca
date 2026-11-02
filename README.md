# Orca Framework

Composable tools for AI-assisted software development: a working style, perspectives that bring different lenses to the same work, and a one-shot build mode — use all of them, or just one.

See [WHY.md](WHY.md) for the motivation and design philosophy.

## Quick Start

### Install into your project

In your project, ask Claude (or another agent) to follow the install skill:

```
Install Orca: follow https://github.com/nicolekc/orca/blob/main/.claude/skills/install-orca/SKILL.md
```

In a project that has it, `/install-orca` updates it. This installs:
- `.orca/` — Framework core (seed, perspectives, one-shot mode, tools)
- `.claude/skills/` — Orca's skills: one-shot builds, the design skills the perspectives use, and the installer itself
- `AGENTS.md` — Project context file, read by Claude (through `CLAUDE.md`, which imports it), Codex and other agents; the installer asks what the project is building
- `.git-hooks/pre-push` (no pushes to main)

## How It Works

### The Seed

`.orca/seed.md` is the working style every agent reads first: own the quality loop, read before judging, fix the root cause, stay in scope, keep it simple.

### Perspectives

Different lenses on the same work. Before doing a kind of work, an agent reads `.orca/perspectives/<name>.md`:

| Perspective | What it does |
|-------------|--------------|
| **architect** | Analyzes the system and designs approaches |
| **implementer** | Writes code, runs tests, commits |
| **code-reviewer** | Evaluates an implementation for correctness, then quality |
| **code-cleaner** | Applies code review principles to make fixes directly |
| **design-reviewer** | Catches structural problems in designs early |
| **qa-engineer** | Verifies the product the way a user would use it |
| **explorer** | Maps codebases before modification |
| **ux-designer** | Routes user-facing work to the design skills |

### One-shot builds

`.orca/oneshot.md` builds a whole app from a high-level goal in one autonomous session, through revertable milestones. Its context lives in a project directory: `AGENTS.md`, `RESOURCE-INDEX.md`, `user-preferences/`, searchable resource categories and `scratch/` handoff notes. `/new-project` creates one, `/new-resource` adds a resource category, and `/oneshot` runs the build.

## Containers: the `orca` command

Each project runs in its own container, with its own home (logins, Claude memory, settings) kept on the Mac in `~/.orca/projects/<project>/home`. The `orca` command manages them from the Mac.

```bash
curl -fsSL https://raw.githubusercontent.com/nicolekc/orca/main/cli/install.sh | bash
orca update        # get the image (and later, newer orca and images)
orca               # pick a project and start it
```

`orca serve` (a dashboard of every project, forward and Claude session), `orca start [folder]`, `orca new <name>`, `orca list`, `orca delete <project>`, `orca forward <port>` (reach a server in the container at `http://<port>.<project>.localhost:7320`; add `--url https://dev.myapp.com` to serve it at a URL of your own too, such as one an OAuth provider has on file, once its hostname points at this machine), `orca update`: see `orca --help`. Working on it: `make help` (source in `cli/`).

Each `orca start` opens a terminal in the project's container: a tmux session that keeps running when its window closes, so a project can have any number of chats going at once. Claude Code and Codex come with the image; each logs in once per project (`claude`, then `codex login --device-auth`, since the container has no browser; it needs device code sign-in turned on in ChatGPT's security settings). Everything orca adds to a container, at creation and every time it runs, is listed in [container-features.md](container-features.md).

## Repository Structure

| Directory | Purpose |
|-----------|---------|
| `framework/` | Framework files, installed into projects as `.orca/` |
| `docs/` | Framework design documentation |
| `.claude/skills/` | Claude Code skills (`/install-orca`, `/oneshot`, `/new-project`, `/new-resource`, design skills) |
| `templates/` | Install templates (AGENTS.md.template, CLAUDE.md.template, .git-hooks) |
| `cli/` | The `orca` command |

### Key Files

| File | Purpose |
|------|---------|
| `framework/seed.md` | Working style principles — read before any task |
| `framework/oneshot.md` | One-shot build mode |
| `.claude/skills/install-orca/` | Installs or updates the framework in a project |

## Design Principles

The framework is governed by [10 design principles](docs/design-principles.md). The key ones:

- **Composable, Not Monolithic** — Each piece is useful alone. No piece requires any other.
- **Principles Over Prescriptions** — State principles, trust the executor. Don't pre-empt with rigid rules.
- **The Specification-Creativity Tradeoff** — More detail in task specs produces worse results. Give context and trust, not step-by-step instructions.

## Git Workflow

- Work on feature branches; never push to main directly (the installed pre-push hook blocks it)
