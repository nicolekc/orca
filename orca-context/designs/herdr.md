# Overlap with herdr

**Status:** open. Revisit before building any multi-session view (see [projects-and-frontends.md](projects-and-frontends.md)).

**Question:** is Orca's container setup duplicating herdr?

- herdr is a terminal multiplexer for coding agents: many agents side by side, and with multi-remote, several SSH machines in one view. As of the last look it offered no isolation, and its container support was added later rather than being its core. That newer support hasn't been checked.
- Orca's core is a different layer: isolation, one home per project so memories don't leak, persistence and migration.
- **Leaning:** don't build the multiplexer part (panes, layouts, attaching). Aim for herdr, or something like it, to work as a viewer over Orca's projects; attaching to one is `docker exec` into its container.
- **Ideas worth borrowing:** a profile per machine, a merged session list labelled by machine, resuming through each agent's own command.

**To check:** how herdr's container support works, and whether it can launch agents with a custom command.
