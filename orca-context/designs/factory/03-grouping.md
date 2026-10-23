# 3. Grouping

**Summary.** When ready tasks arrive, the grouper waits for the burst to settle (a couple of
minutes), then decides once: which tasks belong together, in what order, and which can go to other
workers. It writes its reasons into each group, so you can see and override them. Workers never
negotiate with each other. Nothing found in existing tools does this before handing work out.

## How it decides

**Summary.** Predict what each task touches, link tasks that overlap, and make each linked set one
group; unlinked sets run in parallel. Over-predicting is safe: it only costs parallelism.

1. **Predict touches** at module level, from code search, the import graph, package boundaries, and
   files that historically change together (`git log --name-only`).
2. **Link** tasks that share a module, depend on each other, rely on the same design decision, or
   both change a shared contract (schema, public API, lockfile, migrations).
3. **Group** each linked set. A set too big for one sitting is split into stages that the same
   worker does in order.
4. **Route**: disjoint groups go to different workers; a group that requires Codex waits for a Codex
   worker.
5. **Check while running**: when a group reaches review, `git merge-tree` tests it against the other
   branches in flight and main. A real conflict marks the pair to go in order and tells both workers.
   Semantic conflicts still need tests.

## New work arriving later

- Overlaps a group nobody has claimed: regroup freely.
- Overlaps a claimed group: don't change it under its worker; add a follow-up stage for the same
  worker, or make the new group wait. The grouper records which and why.
- A worker can split or decline a group, with a reason; that goes back to the grouper.

## Why groups rather than fine-grained tasks

**Summary.** Research on agents working at once points the same way: fewer, larger groups that don't
share files beat finer splits.

- A July 2026 study of 33,596 agent pull requests found concurrent agent work is the norm, and
  conflicts common. Reports of a ~30% drop when two agents collaborate on one task are second-hand.
- Claude's agent-teams guidance: give each agent its own set of files.
- Cassandra (ICSE 2013) scheduled tasks from predicted conflicts and avoided most of them; the
  grouper is that idea done by an agent with cheap checks around it.
