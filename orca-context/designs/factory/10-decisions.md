# 10. Decisions and build order

**Summary.** A handful of choices are yours, several mechanisms must be tested before anything is
built on them, and the build goes in steps that are each useful alone.

## Your choices

1. **The queue's home:** plain files in `.factory/` (recommended), with GitHub Issues as a mirror
   later; or GitHub Issues as the source from the start.
2. **Who groups:** the planner you talk to, or a separate grouper session.
3. **How services run:** processes only at first (recommended), or vetted sidecar containers too.
4. **Phone access:** pushes with read-only detail plus Remote Control for answering (no new exposure),
   or the dashboard reachable from the phone (Tailscale Serve), which needs its host checks widened.
5. **Concurrency:** how many workers per subscription, given quota; a cap the factory enforces?
6. **The name**, and whether it lives in this repo as `factory/`.

## To test before building on them

- `codex queue` starts a turn at once in an idle terminal session, and reaches a plain session.
- The Monitor tool's 30-minute re-arm costs as little as documented, over a day.
- Subagents in worktrees for each group, including resuming one for a revision.
- `gh pr comment --attach` with video, on a private repo (who can see attachments).
- Deep `*.localhost` names (`3000.task.project.localhost`) in Safari.

## Build order

Each step is usable alone.

1. **Queue and one Claude worker:** `.factory/` format, `factory` claim/heartbeat/report/wait, the
   worker skill. You queue by hand; one worker takes work.
2. **Planner and grouping:** the planner skill writes tasks; grouping on arrival; parallel workers.
3. **Codex workers** and routing by kind.
4. **Blockers and steering:** questions, answers, steer notes; Mac-side push.
5. **Evidence and review:** review scripts, evidence rounds, send back, approve → merge worker.
6. **Dashboard screen** in `orca serve`.
7. **Environments:** `review.yaml`, per-task addresses and databases, admission by RAM.
8. **Variations.**
9. **Hosts**, when one machine isn't enough.
