# Terminals: several chats in one project

**Status:** decided, built (step 1 of the plan below).

**Goal:** many chats per project, each as light as a new tab, sharing the project's
expensive setup (July transcript: "seats", rejected one-per-box; "the human model comes
first"). Closing a window must not end what runs in it.

**Design:**
- A terminal is a tmux session in the project's container, named `1`, `2`, ... unless named.
  It starts in bash. A Mac window is a view of one: closing it detaches, exiting its shell ends it.
- The container runs in the background. Its main process, `orca-keepalive`, keeps it up while
  any terminal or other `docker exec` shell is open, and exits a minute after the last one ends.
- `orca start` opens a terminal, asking which open one to attach to if there are any;
  `--new`, `--terminal <name>`, `-- <command>` (a new terminal running it).
- `orca stop` stops a container after listing the terminals it ends; `--fresh` and `delete`
  refuse while running and point to it. `orca list` and the dashboard show open terminals.
- tmux keeps its usual Ctrl-b prefix, for others who use tmux; a project's `~/.tmux.conf`
  overrides `/etc/tmux.conf`. If someone wants plain shells instead, add a setting then.
- Containers and images from before terminals (no `orca.terminals` label) keep the old
  behavior, with a note that recreating gives terminals.
- Recreating a container ends its terminals; Claude conversations continue with `claude --resume`.
- Everything orca adds to a container is listed in `/container-features.md`, in two kinds:
  at creation (once, into a new home; never overwriting) and every time.

**Not in this step:** a git worktree per terminal (opt-in, when parallel edits to one repo
need it); `claude agents` view or herdr instead of our own list.

**The plan this is step 1 of:**
1. Terminals, the features list, the git identity copied from the Mac at creation, no claude-bot.
2. Codex in the image, and AGENTS.md as the canonical instructions file (built: Codex's system
   config carries the environment note; projects' CLAUDE.md is `@AGENTS.md`).
3. The multi-repo top level: a generated `.code-workspace` (one root per git repo found, relative
   paths, so it works on the Mac and in an attached editor); then `orca code` as a shortcut
   that opens VS Code attached to the container (optional; not everyone uses an editor).
