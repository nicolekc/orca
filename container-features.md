# What orca adds to a container

A project's container is the orca image plus what orca adds when it creates or starts it. This
is the full list, so nothing about a container is a surprise. Keep it in step with
`cli/features.ts` (what orca adds) and the `Dockerfile` (what the image has).

Orca never changes a file that already exists. The one planned exception is a generated
workspace file for editors, which says it's generated.

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
| Home | `~/.orca/projects/<project>/home` mounted as `~`: logins, Claude memory and settings, installed tools. |
| Network | The project's own network, which only the forwards proxy also joins: projects can't reach each other. |
| Limits | 8 GB of memory, 4 CPUs. |
| Project name | `ORCA_PROJECT`, used in terminal titles; `CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX`, so Remote Control sessions are named after the project rather than the container's random hostname. |

From the image (`Dockerfile`):

| Feature | What it does |
|---|---|
| Terminals | Each `orca start` window shows a tmux session in the container, which keeps running when the window closes. `/etc/tmux.conf` sets orca's defaults (mouse, scrollback, titles, the keys Claude needs); a project's `~/.tmux.conf` can change any of them. |
| Keeping the container up | Its main process (`orca-keepalive`) keeps it running while any terminal or other shell (such as an attached editor) is open, and stops it a minute after the last ends. |
| Environment note | `/etc/claude-code/CLAUDE.md`, which every Claude session reads: what the container is and how it differs from a normal machine. |
| Claude managed settings | `/etc/claude-code/managed-settings.json`, which a project can't change: Claude sessions in other projects can't message this project's sessions (`crossSessionInbound: refuse`), and messages to other machines need approval (`isolatePeerMachines`). |
| Installs into the home | npm, pnpm, yarn, uv and pip install tools into `~`, so they're kept across recreations. Other Python versions go in the container instead (`/opt/uv/python`), because the Mac's disk ignores letter case. |
| No git identity | The image sets none: commits are made as whoever the project's `~/.gitconfig` says. |
