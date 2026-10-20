---
name: new-project
description: Stamp a new project context directory — a git repo with CLAUDE.md, RESOURCE-INDEX.md, user-preferences, and scratch, ready for resources and a one-shot build
---

You are setting up a project context directory with the human. This is interactive — ask when input is missing.

The project name comes from $ARGUMENTS; if absent, ask.

Read `.ralph/oneshot.md` — it defines the project directory's shape and how build agents consume each part. Create the project directory as a new git repo matching that shape, wherever the human wants it (ask if they haven't said), with no resource categories yet (those come later via `/new-resource`, which RESOURCE-INDEX.md should point at).

Solicit from the human:

- A one-paragraph description of what this project is, for `CLAUDE.md`.
- What to seed `user-preferences/` with — their standing requirements in their words, or copied from an existing project they name. Don't invent preferences.

Commit the initial state, then tell the human the project is ready and that `/new-resource <project>` adds searchable resources.
