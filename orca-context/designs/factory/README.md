# The factory: queued work for Claude and Codex workers you open

**Status:** proposed design, 2026-10-23. Not built. Read this page first; each part below has its
own file, which opens with its own summary, then sections that each open with two lines. The raw
research is in `research/` (the deepest layer).

**The idea:** you plan in a main chat and put work on a queue. Workers you opened (Claude or Codex
sessions, each given a role) take it: related tasks are grouped and done together, unrelated ones
in parallel. They ping you on genuine blockers, you can steer any of them, and finished work comes
back with screenshots, video and a live link. You approve, send back, or pick a variation; approval
makes merging a task. A dashboard shows the flow, but work is defined in chat, not there.

## The parts

1. **[Shape and boundaries](01-shape.md).** A small `factory` tool, a plain-file format, and role
   skills for Claude and Codex. Works in any repo and terminal; orca adds containers, live links per
   task, phone pings and the dashboard. Nothing requires orca's PRD framework.
2. **[The queue](02-queue.md).** Plain files in the project (`.factory/`), changed only through the
   `factory` tool, which locks. Tasks are short-lived records; the *group* carries the work's state,
   from claimable to done. GitHub Issues as a mirror later, not the source.
3. **[Grouping](03-grouping.md).** One planner groups tasks when a burst lands: it predicts what each
   touches, links tasks sharing files, decisions or order, and splits the rest for parallel workers.
   No existing tool does this before handing work out; it's the factory's main contribution.
4. **[Workers](04-workers.md).** Sessions you open with a role (`/factory worker`). They wait for
   free and wake on new work (Claude: the Monitor tool; Codex: `codex queue`), and do each group in a
   fresh subagent in its own git worktree, so their own context stays small. Merging is done one at
   a time by a merge worker.
5. **[Blockers and steering](05-blockers.md).** A blocker is a question file; the Mac sends the phone
   push, so containers hold no push credentials. You answer in the dashboard, through the main chat,
   or in the worker's own terminal or Remote Control; steering works the same way.
6. **[Review, revisions and variations](06-review.md).** Each worker writes a Playwright script for
   its work; running it gives screenshots per screen size, before and after, and a chaptered video.
   Rounds are kept; send-back notes can point at a screenshot or a moment in the video. Variations
   are sibling branches shown side by side.
7. **[Environments and capacity](07-environments.md).** A small `review.yaml` says how to bring the
   project up (services, setup, seed, ready checks, login); each task gets its own address and
   database. Heavy services are shared to save RAM; more boxes come later as orca "hosts".
8. **[The dashboard](08-dashboard.md).** A screen in `orca serve`: a "needs you" strip first, lanes
   from queued to done, a review inbox with evidence, workers and RAM, links to GitHub, previews and
   terminals. Steering, approving and picking there; defining tasks, never.
9. **[What exists, and subscriptions](09-landscape.md).** Claude Projects and Orchestrator.inc come
   closest; none groups work first or pools Claude and Codex sessions you open. Under your
   subscription, opening each worker yourself is the safe pattern, though not strictly required;
   quota is the real limit (N workers spend it about N times as fast).
10. **[Decisions and build order](10-decisions.md).** The choices that are yours, the claims still to
    test (several mechanisms are new), and a build order where each step is usable on its own.
