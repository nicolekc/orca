# 2. The queue

**Summary.** Plain files under the project folder, `.factory/`, readable with `cat` and visible to
the Mac through the mount, changed only by the `factory` command, which takes a lock. Nothing has to
be running for the state to be right. Workers claim groups (a lone task is a group of one) with a
lease that a heartbeat renews.

## Where it lives

`.factory/tasks/<id>.md` (front matter plus description), `.factory/groups/<id>.json`,
`.factory/questions/<id>.md`, and `.factory/events.jsonl`, an append-only log the dashboard follows.
Not committed with code: claims and state churn would conflict across branches. Options considered:

| Option | Verdict |
|---|---|
| **Files, written through `factory` (recommended)** | Inspectable, no daemon, works offline and in any container |
| GitHub Issues/Projects | Team-visible and on the phone, but labels can't claim atomically, it needs credentials in containers, and it's slow for leases. Good as a **mirror** later (groups and reviews as issues and PRs) |
| SQLite | Real transactions, but opaque; fine later as an index |
| Beads | Built for agents (atomic claim, dependencies), but now stores in Dolt. A model to copy |
| Claude agent teams' task list | One session's team, Claude only, experimental |

## Lifecycle

**Summary.** A task is short-lived: `draft → ready → grouped → done`. The work lives on the group.

Group: `claimable → claimed → working ⇄ blocked → review ⇄ revise → approved → merging → done`
(also `failed`, `abandoned`).
- Only the main chat, or you, moves a task from draft to ready; the grouper sees only ready tasks.
- A group sent back for revision goes to the same worker first, which still holds its context.
- Approval creates a group of kind `merge`, which only a merge worker takes.
- `variations: 3` makes three sibling groups; picking one abandons the others (kept as tags).

## Claiming

**Summary.** A claim is a lease with a heartbeat, taken under a lock, so two workers never take the
same group, and a stalled worker's group comes back.

- `factory claim --kind claude` locks `.factory/lock`, picks the best claimable group the worker may
  take (`requires: claude | codex | any`), and records the worker and the lease's end.
- The worker's wait script renews the lease every minute or two, costing no tokens.
- A lapsed lease makes the group claimable again, carrying its branch so the next worker resumes.
- Every write carries the claim's id; writes from a lapsed claim are refused, so a stuck worker can't
  overwrite someone else's group.
- Across machines later: claim by pushing a git ref that mustn't already exist.

## A task record

```yaml
id: t-7f3a
title: Add CSV export to reports
status: ready
requires: any            # claude | codex | any
variations: 1
repo: app                # in a project of several repos
depends_on: [t-11c2]
decisions: [d-auth-session]
env: {preview: true, services: [db]}
acceptance: |
  What done looks like; the evidence has to show it.
```

The grouper adds `touches` (predicted files and modules). A group adds its tasks, kind, order,
claim, branch, worktree, questions, evidence rounds and review decisions.
