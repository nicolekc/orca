# 6. Review, revisions and variations

**Summary.** Each worker writes a Playwright script showing its work; running it gives the evidence.
Each round's evidence is kept, so round 2 lines up with round 1. Variations are sibling branches
shown side by side. Approval makes "merge it safely" a task.

## Evidence

**Summary.** A re-runnable script beats an agent clicking around: it gives before/after for free
(run it on main and on the branch), lines up across rounds, and doubles as a regression test.

- **Screenshots:** each route at each screen size (default a phone and a laptop), in key states.
- **Video:** Playwright's screencast with chapters ("1. Sign in", "2. Export"), converted to MP4 by
  ffmpeg so phones play it.
- **Traces** for debugging, not as the main review medium.
- **Where:** `evidence/<group>/<round>/` with a `manifest.json` (route, size, commit, notes), outside
  git. A summary goes on the pull request with `gh pr comment --attach` (new in gh 2.99), the first
  supported way to put images and video on a PR.
- **Safety:** evidence comes from untrusted containers, and the dashboard holds its token, so it
  serves only images and video, never HTML or SVG, with headers that stop browsers guessing types.

## Revisions

**Summary.** "Send back" writes notes for the next round, which can point at a screenshot or a
moment in the video; the same worker picks it up with its context.

Rounds are append-only (commit, evidence, notes, decision), which is also the record of why the work
looks the way it does. The dashboard can show round 1 against round 2 like before/after.

## Variations

**Summary.** A task asking for N variations becomes N sibling branches, each with its own live link,
shown as a grid of the same screens at the same sizes.

- UI-only variations can share one backend and database, so only N front ends run.
- **Pick v2** (optionally "v2, with v3's header"): v2 becomes the branch, the others are kept as tags
  and their environments stop, and notes start a revision round.

## Approval

Approving creates a merge group for the merge worker ([part 4](04-workers.md)), which also re-runs the
review script on the merged result.
