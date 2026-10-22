# Devcontainers

**Status:** open. Direction, not yet built.

**What they are:** an open spec ([containers.dev](https://containers.dev)). A repo commits `.devcontainer/devcontainer.json`: image or Dockerfile, extra tools, mounts, setup commands. VS Code ("Reopen in Container"), GitHub Codespaces, JetBrains, DevPod and the `devcontainer` CLI read it, and the tool creates and owns the container.

**Where Orca stands:** Orca creates containers itself, with one image for every project, and writes nothing into repos. So any project can still be opened with devcontainers, but Orca ignores a project's own `.devcontainer` (a project that needs Postgres or a particular toolchain gets the generic image).

**Direction:** Orca shouldn't own how a container is defined; the spec should. Orca's own value is per-project homes outside the repo, isolation between projects, forwards through the proxy, and the picker, dashboard and sessions. A possible shape:
- Each project record holds a `devcontainer.json` (image, home mount, network, labels): a plain, visible file.
- The `devcontainer` CLI creates and starts containers from it, or from the project's own `.devcontainer` merged with Orca's additions.
- Editors and other tools then see an ordinary dev container.

Costs: Node on the Mac for the `devcontainer` CLI (orca is a single binary today); container start goes through a tool Orca doesn't control; unverified whether VS Code reopens a container whose config lives outside the repo smoothly (attaching works regardless).

**Triggers:** a project with its own `.devcontainer` that should be honored, or wanting VS Code to manage containers fully.

**Cheap step meanwhile:** "Open in VS Code" by attaching to the container Orca started; VS Code can open an attached container from the command line (`code --folder-uri vscode-remote://attached-container+…`), so this could be one `orca` command or a dashboard button. The editor's language servers and extensions run in the container. VS Code's server installs into `~`, so it persists. Before offering it, turn off what the Dev Containers extension does by default and would cross Orca's trust boundary: copying the Mac's git config and credentials in, forwarding the SSH agent, and auto-forwarding ports to the Mac's localhost (which other projects' containers can reach). Confirm the setting names then.

**Fixed either way:** the container path stays `/workspace` (devcontainers default to `/workspaces/<folder>`, but it's configurable). Claude Code keys session history by working directory, so changing it would orphan every project's sessions.
