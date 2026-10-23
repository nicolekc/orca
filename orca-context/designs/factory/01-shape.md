# 1. Shape and boundaries

**Summary.** The factory is three things: a file format for tasks, groups, questions and evidence; a
small `factory` command that is the only writer of that format; and role skills (planner, worker,
merge) that Claude and Codex both load. That core runs in any repo and terminal. Orca, when present,
adds isolation, live links, phone pings and the dashboard.

## The flow, end to end

You describe work in the main chat; the planner writes tasks and marks them ready. The grouper (the
planner, in another role) groups them. A worker of the right kind claims a group, works in its own
worktree with its own environment, asks if genuinely blocked, and finishes with evidence. You
review: approve, send back with notes, or pick a variation. Approval creates a merge task, which the
merge worker lands. Every step is a plain-file change and an event, so the dashboard and you can see
it.

## What's in the core, and what orca adds

The core works without orca: `factory` (TypeScript/Bun like orca, one file per platform), the
`.factory/` format, and skills in the Agent Skills format, which Claude and Codex both read.

| Without orca | With orca |
|---|---|
| Workers are terminals you open anywhere | Workers are orca terminals in the project's container (tmux, survive their window) |
| Isolation is a git worktree per group | Same, inside the project's container, cut off from other projects |
| Live links: whatever port the environment uses | One address per task: `http://<port>.<task>.<project>.localhost:7320` |
| Status: `factory status` in a terminal; GitHub mirror if wanted | The dashboard screen, plus pushes to the phone sent from the Mac |
| Environments run as processes | Also vetted sidecar containers, and later other hosts |

## Roles

One skill per role, opened by you in a session of your choice (`/factory planner`, `/factory worker`,
`/factory merge`). You can run a Claude planner and a Codex planner side by side and keep the one
you like. Roles are prompts and a tool, not a framework: no perspectives or PRD pipelines are
needed, though a project that has them can point the skills at them.

## Naming

"Factory" is a working name. The module lives in this repo (e.g. `factory/`), separate from `cli/`,
because it doesn't require orca.
