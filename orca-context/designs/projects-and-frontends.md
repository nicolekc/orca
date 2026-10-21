# Projects as records, with several front ends

**Status:** open. Revisit when starting from a folder gets in the way, or before building any menu, dashboard or orchestrator.

## Goal

Start, browse, enter, create and delete projects from any of: the old way (`cd` + `orca-start.sh`), an interactive command-line menu, or a web dashboard (like the Docker app). All of them show the same projects and sessions. Creating a project shouldn't require choosing where its files live, but they must persist on the Mac.

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
