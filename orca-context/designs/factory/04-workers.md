# 4. Workers

**Summary.** You open a session (Claude or Codex) and give it a role. It waits for free, wakes when
there's work for its kind, and does each group in a fresh subagent in its own git worktree, so the
session you opened stays a small dispatcher you can talk to. Several of these mechanisms are new and
need testing first (see [decisions](10-decisions.md)).

## Waiting and waking

**Summary.** Waiting must cost no tokens and a wake one turn. Claude: the Monitor tool watching a
`factory wait` script. Codex: `codex queue` pushing a message into the session.

**Claude Code**
- **Monitor (recommended):** the worker runs `factory wait` under Monitor; each line it prints
  (`group g-12 claimable`, `answer q-3`, `steer …`) arrives as an event and wakes the session. A
  watch lasts at most 30 minutes, so an idle worker re-arms about twice an hour.
- **`/loop` (fallback):** self-paced wakeups; costs a turn per wake even with nothing to do.
- **Channels (later):** true push from an MCP server; a research preview that needs a development
  flag and a confirmation at every start.
- **Cross-session messaging:** blocked by orca today (`crossSessionInbound: refuse`), and not needed:
  everything goes through `.factory/`.

**Codex CLI**
- **`codex queue --thread <session> --message …` (to test first):** queues a message into an existing
  session. Unverified: whether it starts a turn straight away in an idle terminal session.
- **App server:** your terminal and the factory both connect to one `codex app-server`; the factory
  can start and steer turns. Labelled experimental.
- **`notify`:** tells the factory when a Codex turn ends, at no token cost. Hooks can chain the next
  group but can't wake an idle session.

## Clean context per group

**Summary.** A model can't clear its own context, so the session you opened dispatches: it claims,
starts a named subagent with the group's brief in a worktree, relays questions, and records the
result. A revision resumes the same subagent.

- Claude: subagents with `isolation: worktree`. Subagents' prompt cache lasts 5 minutes (the main
  conversation's an hour); `subagentPromptCacheTtl: "1h"` helps groups that wait on answers.
- Codex: subagents exist but have no worktree option, so the dispatcher makes the worktree.
- Alternative for heavy groups: restart the worker session every few groups.

## Isolation

**Summary.** A worktree per group inside the project's container, a port block and database name
per worker. A container per worker comes later, if RAM or trust needs it.

Worktrees are cheap and share logins and the network, but each needs its own dependency install
(there's no shared `node_modules`). Environments are in [part 7](07-environments.md).

## Merging safely

**Summary.** Merging is its own task, done one at a time per repo by a merge worker.

The merge worker rebases onto main, runs the checks, pushes, and lands through GitHub's merge queue
or auto-merge (or fast-forward locally without CI). Before landing it tests the other approved
branches with `git merge-tree` and tells their owners about new conflicts. A conflict it can't
resolve trivially goes back to the original worker as a revision. No agent pushes to main.
