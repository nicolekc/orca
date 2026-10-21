# Shared tools mount (agent CLIs chosen per project)

**Status:** open. Revisit when Codex is added, when per-project Claude copies take too much disk, or with the per-project settings work.

## Today (PR #21)

The image installs Claude with the native installer into `/opt/claude`. Claude updates itself into each project's home (`~/.local/bin`, first on `PATH`), so every project keeps its own copy, about 280 MB per version.

## Proposal

- Agent CLIs that are self-contained (Claude, Codex) live once in `~/.orca/tools/<tool>` on the Mac and are mounted **read-only** into containers.
- Each project's settings list which tools it uses (the "checkboxes"). Starting a container adds one mount and one `PATH` entry per tool.
- Tools that need system packages (Playwright and its browsers, gh, git) stay in the base image. If one of them ever has to be optional, build one image per combination of tools for that case only.

## Updates

- Containers never write to the shared copy: it's read-only, and `DISABLE_AUTOUPDATER=1` stops Claude from fetching its own copy into the home.
- `orca update` (run by hand or on a schedule) installs each new version in its own folder and moves a "current" pointer to it. The installer writes absolute links, so it must run with the folder at the same path that containers mount it at.
- At start, a container locks in the current version (one link in its own filesystem, no copying). Running sessions are never affected, and a restart picks up updates.
- Clean-up: delete only versions that no running container is locked to.
- Edge case: a release that becomes mandatory needs long-running containers restarted. `orca update` could list which ones are on old versions.

## Considered and rejected

- **Writable shared copy**: one project's agent could change the program every other project runs.
- **Copying the tools into the container at each start**: slower starts, and the version lock-in above gives the same behavior without copying.

## Tested (2026-10-21, without Docker)

- Claude runs from a read-only copy, with several homes sharing it; everything it writes goes to the home.
- With `DISABLE_AUTOUPDATER=1`, `claude doctor` reports auto-updates disabled.
- Without that setting, an image-time copy updates into the running home and leaves itself unchanged. This is how today's per-project updates work.

## Switching later

No migration is needed: put the tools mount ahead of `~/.local/bin` on `PATH`. The per-project copies are disposable.
