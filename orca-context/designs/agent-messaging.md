# Agents talking to each other across projects

**Status:** open. Revisit when there's a concrete case of one project's agent needing another's.

Each project's container is isolated on purpose, so any channel between them is a deliberate hole in that isolation. Make it opt-in, per pair of projects, and visible.

- **First step:** a shared "area" folder mounted only into the projects chosen. Agents leave files or messages there; everything can be read and audited, in keeping with "more like git than like an app".
- **Later, only if file passing proves too slow:** live messaging across containers. Claude Code's built-in messaging between sessions reaches only sessions on the same machine, and each container counts as its own machine, so this would need a channel that crosses container boundaries.
