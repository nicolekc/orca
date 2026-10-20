# One-Shot: Goal-Directed Build Mode

You take a high-level goal with a definition of done and build the whole thing in one session. No PRD, no task pipeline, no prescribed process. How to get from goal to done is yours to figure out — work in whatever layers make sense for this build.

This file tells you what kinds of context exist and how each kind is used. The instances live in the project directory — every build belongs to a project.

**IMPORTANT — the system has three parts. Use all three:**

1. **The project directory** — every build belongs to a project directory, `<project>/`, which can live anywhere. Its `CLAUDE.md` and `RESOURCE-INDEX.md` tell you what context exists for this build.
2. **Semantic search** — the easiest way to find an idea in the human's background knowledge or scratch.
3. **Perspectives** — if doing work that matches a perspective, **ALWAYS** read the perspective file; when dispatching a subagent for that work, **ALWAYS** name the file in its prompt. The agent can use its own expertise, but the perspective gives helpful additional values we believe in.

## The Project Directory

The goal names the project directory: a git repo holding the project's CONTEXT (not necessarily its code).

```
<project>/                      # git repo: this project's context
├── CLAUDE.md                   # entry point — read first
├── RESOURCE-INDEX.md           # which resource categories exist, and how to use each
├── user-preferences/           # markdown, always read in full
├── <resource categories>/      # raw files + search db + AGENTS.md, one dir per category
├── scratch/                    # handoff notes for work in flight
└── ...                         # ad-hoc context, indexed by CLAUDE.md
```

- `CLAUDE.md` — the project's entry point. Always present, read first. It orients you to everything in the directory, including any ad-hoc context the human left at the root.
- `RESOURCE-INDEX.md` — lists this project's resource categories: what each holds and how to use it. A category is a directory of raw files with a pre-built search db and its own AGENTS.md.
- `user-preferences/` — the human's standing requirements: stack, tooling, conventions. Markdown, always read in full before making decisions they govern. The goal can override them.
- `scratch/` — handoff notes for work in flight. See its section below.
- `[project code destination]` — where the project is built. May be in `<project>/...` or might not, optionally specified by user at goal launch time. Default to `<project>/app` or `<project>/[name]` if more than one build exists.

Resources are the human's background knowledge, pre-ingested before the session starts and read-only during it. Semantic search is the easiest way to find an idea in them; each category's AGENTS.md relays how the human thinks about that material — read it before querying that category, and let it shape your queries. Grep works too, though the raw files can be huge. Recency matters, and nothing is gospel — the human's later thinking may never have been written down.

## Scratch

Scratch holds handoff notes: what an agent picking this work up without your context needs to know. Date them, and delete them once the work has shipped or the note has been picked up.

## Semantic Search

`.orca/tools/semantic-search/` — one tool for querying every resource category and scratch. Its README documents ingest and query.

## Perspectives

`.orca/perspectives/` describe how to think when doing a kind of work — posture, not process. Before doing work listed below, read the matching perspective; when dispatching a subagent for that work, name the file in its prompt. Ignore pipeline mechanics inside any perspective (splitting, spec handoffs, kickbacks) — those belong to the PRD process.

- **architect** — before shaping the system or making any major approach decision
- **ux-designer** — when shaping or reviewing anything user-facing
- **design-reviewer** — once an approach exists for something substantial; catches structural problems and over-prescription early
- **qa-engineer** — when verifying: run the product the way a user would
- **explorer** — before building into or modifying an existing codebase
- **code-cleaner** — after heavy building, e.g. approaching a milestone; reviews and fixes directly

## What This Mode Never Uses

One-shot lives beside the PRD process and never borrows from it:

- No PRD files, tasks, pipelines, or statuses — `.orca/processes/prd.md` and `build-cycle.md` do not apply
- No orca.md supervision mechanics — no one-agent-one-step invariant, no pipeline bookkeeping, no branch-per-PRD, no PR-as-dashboard
- No planner, spec-reviewer, or code-reviewer perspectives — those are pipeline roles
- No signoff gates

## Milestones

Build through revertable milestones — the goal usually says roughly how many (e.g. 6–10). Each milestone is a coherent, working checkpoint of the product, committed and git-tagged (`m1`, `m2`, …, annotated with a one-line description of the state) in the build target's repo, so the human can later revert to any of them and take a different path from there. What each milestone contains is your call.

## Ground Rules

- Only the project context directory has a fixed shape — the build target lives wherever the goal says.
- The definition of done comes from the goal. If it's missing, derive one, write it down, and hold yourself to it — never stop to ask.
- Full autonomy: no permission-seeking, no option menus, no pausing for confirmation.
- Give the built app a CLAUDE.md that breadcrumbs the project directory and this context system.
- The final summary is honest: what's done, what's shaky, exact commands to run it.
