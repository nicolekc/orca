---
name: install-orca
description: Install the Orca framework into a project, or update it to the latest and report what's out of date. Use when asked to install, add, set up or update Orca (its .orca/ folder and skills) in a repo.
---

# Install Orca

Install Orca into the project you're run in, or update it, from the orca repo the user names or the public one (github.com/orca-infra/orca), with its history. Git repos nested in the project are projects of their own.

Nothing is written, replaced or removed until the user has seen what will change and agreed.

## What Orca installs

- `framework/`, as `.orca/`
- These skills, into `.claude/skills/`: `install-orca`, `oneshot`, `new-project`, `new-resource`, and the design skills the perspectives use (`product-ux-design`, `ui-mechanics`, `ui-ux-pro-max`, `ux-designer`)
- The pre-push hook in `templates/`, which stops pushes to main, without disturbing hooks the project already has
- `AGENTS.md` and `CLAUDE.md` from `templates/`, if missing. The project's instructions should point agents to `.orca/seed.md` and say what the project is and who it's for, and for software, whether it's general (the seed's default) or a one-off; ask the user for what's missing.

## On an update

Whatever an earlier Orca installed (in `.orca/`, or under an earlier name such as `.ralph/`) and this one doesn't is out of date, including conventions it had projects follow; the history says what was removed and why. Look one level into the project for files and instructions built on what changed, and name them for the user to consider. Change nothing of the project's own beyond that.

The orca repo's `CHANGELOG.md` says what users should know; put its entries since the project's last Orca update (its history says when) on the card, those marked **Action needed** first.

## The update card

Before changing anything, show a concise card of what would be added, replaced, changed or removed, and what the user may want to look at, each with a short reason. Present it and settle it with the user however works best. Then apply what was agreed, removing only what the card listed, and don't commit.
