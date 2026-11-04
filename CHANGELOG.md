# Changelog

What people using Orca should know, newest first: anything they have to do (marked **Action needed**), changes they'd notice, and new things worth knowing about. Everything else is in the git history. `orca update` shows the entries since the build it replaces; updating Orca in a project (`/install-orca`) shows the ones since that project's last update.

## 2026-11-04

- In the `orca` project list, `u` switches the selected project to the newest image (shown when it has an image update), and `d` asks whether to delete its home too.
- Deleting a project's home now lists what's in it first, with sizes.

## 2026-11-03

- Orca moved to github.com/orca-infra/orca, and its image to ghcr.io/orca-infra/orca. Old links redirect and `orca update` switches over by itself, so there's nothing to do.
- `orca update` now shows what's new here when it updates itself.
