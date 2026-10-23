---
name: install-orca
description: Install the Orca framework into a project, or update it to the latest. Use when asked to install, add, set up or update Orca (its .orca/ folder, skills and orca-context/) in a repo.
---

# Install Orca

Install the Orca framework into the current project, a git repo, or update one that has it. Running this again updates it: framework files are replaced, and the project's own files are kept.

## 1. Get the source

Use the orca checkout the user names. Otherwise clone it into a temporary folder: `git clone --depth 1 https://github.com/nicolekc/orca`. Below, `SRC` is that checkout.

## 2. Framework files: copy, replacing what's there

| From `SRC` | To the project |
|---|---|
| `framework/` | `.orca/` |
| `.claude/skills/<name>/`, for `orca`, `discover`, `refine`, `product-ux-design`, `ui-mechanics`, `ui-ux-pro-max`, `ux-designer` | `.claude/skills/<name>/` |
| `templates/.git-hooks/pre-push` | `.git-hooks/pre-push`, executable |

Then `git config core.hooksPath .git-hooks`, which stops pushes to main or master. If the project already has hooks (in `.git/hooks`, or another `core.hooksPath`), ask first.

On an update, if the project has files in these folders that `SRC` doesn't, list them and ask before removing any. Leave installed dependencies and downloads (`node_modules/`, models) alone.

## 3. Project files: create only if missing, never change

- `AGENTS.md` from `templates/AGENTS.md.template`, and `CLAUDE.md` from `templates/CLAUDE.md.template` (the line `@AGENTS.md`, so Claude reads AGENTS.md too). If the project has a `CLAUDE.md` but no `AGENTS.md`, create neither, and tell the user that to share it with other agents, they can move it to `AGENTS.md` and make `CLAUDE.md` the line `@AGENTS.md`.
- `orca-context/overrides/`, `knowledge/`, `prds/`, `designs/` and `tasks/`, each with a `.gitkeep`.
- `.gitignore`: whichever of these lines are missing, under `# Orca`: `.orca-tasks/*/debug-*`, `.orca-tasks/*/scratch-*`, `orca-logs/`.

## 4. Bash-loop mode, only if the user asks for it

Copy `ORCA_PROMPT.md`, `orca-loop.sh` and `orca-once.sh` from `SRC` to the project root, replacing what's there; the scripts executable.

## 5. Finish

- Remove the temporary clone, if you made one.
- Don't commit. Tell the user what was created, updated, and left as it was.
- Next steps: `/discover` fills in `AGENTS.md`; then commit.
