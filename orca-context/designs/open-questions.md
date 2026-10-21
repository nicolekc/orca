# Open design questions

Decisions deliberately postponed. Check here before working on the related area.

- [Shared tools mount](shared-tools-mount.md): one read-only copy of each agent CLI, chosen per project, instead of a copy in every project's home.
- [Projects and front ends](projects-and-frontends.md): projects as records under `~/.orca/projects`, an optional code location, and a command line, menu and web dashboard over the same projects.
- [Overlap with herdr](herdr.md): what to build versus reuse for viewing many agent sessions.
- [Agent messaging](agent-messaging.md): letting agents in different projects talk, without giving up isolation by default.
