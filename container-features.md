# What orca adds to a container

A project's container is the orca image plus what orca adds when it creates or starts it. This
is the full list, so nothing about a container is a surprise. Keep it in step with
`cli/features.ts` (what orca adds) and the `Dockerfile` (what the image has).

Orca never changes a file that already exists, with one exception: the workspace file (below),
while its first line still says orca made it.

## At creation

Done once, when orca creates a project's home (its first container). Never repeated, and never
applied to an existing home, including on `orca start --fresh` and after a migration. Each is
printed as it's done, and each can be left out: `orca start --without <feature>` (or
`orca new`), or for every new project, `"without": ["<feature>"]` in `~/.orca/config.json`.

| Feature | What it does |
|---|---|
| `git-identity` | Copies the Mac's `git config --global user.name` and `user.email` into the project's `~/.gitconfig`, so commits are yours. Without it (or with none on the Mac), the project has no identity until you set one. |

## Every time

Part of every container orca creates, so in effect whenever it runs. Changing one of these
reaches an existing project when its container is recreated (`orca start --fresh`).

From orca (`cli/features.ts`):

| Feature | What it does |
|---|---|
| Project folder | Mounted at `/workspace`. |
| `workspace-file` | On every `orca start`, in a folder holding git repos below its top (up to three levels; not `node_modules` or hidden folders): `<project>.code-workspace`, for VS Code and Cursor. One root for the top and one per repo, so search and indexing reach each repo; the top's root hides them, so nothing shows twice (except a repo another repo has a folder at the same path as: editors hide by path in every root). Paths are relative, so it works on the Mac and in an editor attached to the container. Rewritten when the repos change, while its first line is orca's; remove that comment to keep your own. Leave it out with `"without": ["workspace-file"]` in `~/.orca/config.json`. |
| Home | `~/.orca/projects/<project>/home` mounted as `~`: logins, Claude memory and settings, installed tools. |
| Network | The project's own network, which only the forwards proxy also joins: projects can't reach each other. |
| Box settings | Memory and CPUs: 8 GB and 4 unless set with `orca settings` (or a project's Box settings on the dashboard), for one project (`box-settings.json` in its record) or as the defaults (`"boxSettings"` in `~/.orca/config.json`). A change reaches an existing container at once, without recreating or restarting it (`docker update`), and `orca start` brings a container up to date with them. Swap is twice the memory, Docker's default. |
| Kept-up mark | `/run/orca`, an in-memory folder emptied on every start, where `orca up` marks the container to keep running (see Keeping the container up, below). |
| Project name | `ORCA_PROJECT`, used in terminal titles; `CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX`, so Remote Control sessions are named after the project rather than the container's random hostname. |

From the image (`Dockerfile`):

| Feature | What it does |
|---|---|
| Terminals | Each `orca start` window shows a tmux session in the container, which keeps running when the window closes. `/etc/tmux.conf` sets orca's defaults (mouse, scrollback, titles, the keys Claude needs); a project's `~/.tmux.conf` can change any of them. `LANG=C.UTF-8` so tmux shows non-ASCII characters rather than `_`. |
| Keeping the container up | Its main process (`orca-keepalive`) decides when it stops. Started with `orca up`, it runs until `orca stop`, with or without terminals (for an attached editor or a server, say). Otherwise it runs while any terminal is open and stops a few seconds after the last ends, waiting up to 15 seconds for the first. Containers from images before this ran until a minute after their last terminal or other shell ended. |
| Environment note | `/etc/claude-code/CLAUDE.md`, which every Claude session reads (Codex gets the same text, below): what the container is and how it differs from a normal machine. |
| Codex settings | `/etc/codex/config.toml`, Codex's system config (a project's `~/.codex/config.toml` overrides it): no sandbox of its own (`danger-full-access`), since the container is the sandbox and Docker blocks the namespaces Codex's needs; and the environment note above as its developer instructions. |
| Claude managed settings | `/etc/claude-code/managed-settings.json`, which a project can't change: Claude sessions in other projects can't message this project's sessions (`crossSessionInbound: refuse`), and messages to other machines need approval (`isolatePeerMachines`). |
| Installs into the home | npm, pnpm, yarn, uv and pip install tools into `~`, so they're kept across recreations. Other Python versions go in the container instead (`/opt/uv/python`), because the Mac's disk ignores letter case. |
| No git identity | The image sets none: commits are made as whoever the project's `~/.gitconfig` says. |
