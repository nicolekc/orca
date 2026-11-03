# What orca adds to a container

A project's container is the orca image plus what orca adds when it creates or starts it. This
lists all of it in one place, so how the pieces fit together is visible, and nothing about a
container is a surprise. Each entry says what the feature is for and where it's defined; the
definition is the source, and the details live there.

Orca never changes a file that already exists, except the workspace file while it still carries
orca's mark.

## At creation

Done once, when orca creates a project's home, and never repeated (`CREATION` in
`cli/features.ts`). Each can be left out, per project or for every new one (`optionalIds`).

| Feature | For | Defined in |
|---|---|---|
| `git-identity` | Commits in the project are the user's, as on the Mac | `cli/features.ts` |

## Every time

Part of every container orca creates, so a change reaches an existing project when its container
is recreated.

From orca:

| Feature | For | Defined in |
|---|---|---|
| Project folder | The project's files, mounted from the Mac | `containerArgs` in `cli/features.ts` |
| Home | Logins, Claude memory and settings, and installed tools, kept per project on the Mac | `containerArgs` |
| Network | Projects can't reach each other; only the forwards proxy joins | `containerArgs`, `cli/proxy.ts` |
| Box settings | Memory and CPUs, per project or as defaults | `cli/box-settings.ts` |
| Kept-up mark | Lets `orca up` keep the container running without terminals | `containerArgs`, `image/keepalive.sh` |
| Project name | Terminal titles and Remote Control sessions named after the project | `containerArgs` |
| `workspace-file` | Editors search and index each git repo in the project folder (optional) | `workspaceFile` in `cli/features.ts` |

From the image:

| Feature | For | Defined in |
|---|---|---|
| Terminals | Each window is a tmux session that keeps running when the window closes | `image/tmux.conf`, `Dockerfile` |
| Keeping the container up | The main process decides when the container stops | `image/keepalive.sh` |
| Environment note | Every Claude and Codex session knows what the container is | `image/environment.md` |
| Codex settings | Codex runs without a sandbox of its own, since the container is one | `image/codex.toml` |
| Claude managed settings | Limits on messaging between sessions, which a project can't change | `image/managed-settings.json` |
| Installs into the home | Tools a project installs are kept when its container is recreated | `Dockerfile` ("Installs inside containers") |
| Locale and tab completion | Terminals show non-ASCII text and complete arguments | `Dockerfile` |
| No git identity | Commits are made as whoever the project's `~/.gitconfig` says | `Dockerfile` (sets none) |
