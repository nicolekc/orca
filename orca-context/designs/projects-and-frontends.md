# Projects as records, with several front ends

**Status:** in progress.
1. **Done:** the `orca` command (`cli/`, TypeScript compiled with Bun): picker, `start`, `new`, `list`, `delete`, `update`, over the records described here.
2. **Done:** `orca forward`: a Caddy proxy (`orca-proxy`) on `127.0.0.1:7320` (`proxyPort` in `~/.orca/config.json`), hostnames `<port>.<project>.localhost`, a network per project that only the proxy also joins, and requests from project networks refused. Orca runs the proxy while any project has forwards; no restart policy.
3. **Done:** `orca serve`: a dashboard on `127.0.0.1:7321` (`servePort`) with projects, one project (forwards, sessions, image update, delete) and recent sessions across projects; actions open a terminal (`terminal` in config.json, default macOS Terminal). React + shadcn, bundled into the `orca` file by Bun. Guarded by a per-run token (see "Container Trust Boundary" in CLAUDE.md).
4. **Later:** a Mac app that owns `orca serve` and the proxy; a terminal picker in the dashboard over the same setting.

## Goal

Start, browse, enter, create and delete projects from any of: the old way (`cd` + `orca start`), an interactive command-line menu, or a web dashboard (like the Docker app). All of them show the same projects and sessions. Creating a project shouldn't require choosing where its files live, but they must persist on the Mac.

## Proposal

- **A project is a record**, not a container or a folder: `~/.orca/projects/<name>/` holds its home and a settings file (name, where its code lives, which runtime, later which tools; see [shared-tools-mount.md](shared-tools-mount.md)). Every front end reads and writes these records.
- **Code location is optional**: `orca new <name>` puts the code in `~/.orca/projects/<name>/workspace`; an existing folder can be pointed to instead. Today the folder name identifies the project and `project-path` records the folder.
- **One command-line core**, with the menu and dashboard as thin layers over it, so the command line is never second-class.
- **Containers carry a project label**, instead of being matched by name or mounts. They stay disposable.
- **Runtime is swappable** (Docker, Podman): keep every call to it in one small file and use only flags both support.
- **Cross-project recents**: each project's Claude sessions are in its home (`~/.claude/projects/`), so a front end can list them all, labelled by project. Memories stay per project.

## Also deferred

- Shared logins with a per-project override. Remote Control needs an interactive login, so a token alone isn't enough.
- An "area" folder shared by chosen projects (see [agent-messaging.md](agent-messaging.md)).
