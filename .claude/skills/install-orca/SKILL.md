---
name: install-orca
description: Install the Orca framework into a project, or update it to the latest and report what's out of date. Use when asked to install, add, set up or update Orca (its .orca/ folder and skills) in a repo.
---

# Install Orca

Install the Orca framework into the current project, a git repo, or update one that has it. Nothing is written, replaced or deleted until the user has seen what will change and agreed.

## 1. Get the source

Use the orca checkout the user names. Otherwise clone it into a temporary folder: `git clone https://github.com/nicolekc/orca`. Below, `SRC` is that checkout.

## 2. Plan, changing nothing

- **Framework files**, to be replaced or added:

  | From `SRC` | To the project |
  |---|---|
  | `framework/` | `.orca/` |
  | each skill in `.claude/skills/` | `.claude/skills/<name>/` |
  | `templates/.git-hooks/pre-push` | `.git-hooks/pre-push`, executable, with `git config core.hooksPath .git-hooks` (which stops pushes to main or master) |

- **What's out of date**, on an update. Compare the installed framework (`.orca/`, or the same files under an earlier name such as `.ralph/`) with `SRC`. Whatever the installed version has and `SRC` no longer does is out of date: files, skills, folders it had projects keep, conventions its templates put into project docs, and anything in the project that exists only because of them. `SRC`'s git history shows what was removed or renamed, and why. Then read the project's docs and instructions against the new `seed.md`, for what it now says doesn't belong or should be done differently.
- **Project files.** If missing, `AGENTS.md` from `templates/AGENTS.md.template` and `CLAUDE.md` from `templates/CLAUDE.md.template` (the line `@AGENTS.md`); a project with only a `CLAUDE.md` might move it to `AGENTS.md`. The project's instructions should point agents to `.orca/seed.md`, and say what the project is building, who it's for, and whether it's general software (the seed's default) or a one-off. Get that from the user if they don't.

Leave installed dependencies and downloads (`node_modules/`, models) alone, and existing git hooks unless the user agrees.

## 3. Show the update card, and get agreement

A concise summary of everything that would be added, replaced, changed or deleted, and what's out of date but needs the user's judgment, each with a short reason. Present it however reads best, and settle it with the user however works: they may approve it all, leave things out or change them. When it's unclear whether something still serves the project, leave it to them.

## 4. Apply what was agreed, and finish

- Remove the temporary clone, if you made one.
- Don't commit. Tell the user what was done.
