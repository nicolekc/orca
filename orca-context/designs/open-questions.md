# Open design questions

Decisions deliberately postponed. Check here before working on the related area.

- [Shared tools mount](shared-tools-mount.md): one read-only copy of each agent CLI, chosen per project, instead of a copy in every project's home.
- [Projects and front ends](projects-and-frontends.md): projects as records under `~/.orca/projects`, an optional code location, and a command line, menu and web dashboard over the same projects.
- [Overlap with herdr](herdr.md): what to build versus reuse for viewing many agent sessions.
- [Agent messaging](agent-messaging.md): letting agents in different projects talk, without giving up isolation by default.
- [GitHub bot identity](github-bot-identity.md): letting Claude comment and review on GitHub as itself while commits stay the user's.
- [Devcontainers](devcontainers.md): moving container definition to the devcontainer spec, and opening projects in VS Code.
- [The node_modules volume](node-modules-volume.md): decided, no volume; the costs accepted and when to revisit.
