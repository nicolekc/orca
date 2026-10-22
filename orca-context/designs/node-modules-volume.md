# The node_modules volume

**Status:** decided (October 2026): no volume. `node_modules` is part of the project folder like everything else in `/workspace`.

**Why:**
- Installs and builds happen in the container; the Mac folder is for seeing and editing files, and for persistence. So Mac and Linux builds don't compete for the same folder.
- One rule for every package manager and for Python `.venv`s. The volume only ever covered the top-level `node_modules`; nested ones (monorepos, subprojects) were shared anyway.
- The Mac sees real packages, so a Mac-side editor resolves imports.
- Projects migrated from pre-orca containers already have their Linux `node_modules` in the folder; a volume hid it and forced a reinstall.

**Costs accepted:**
- Installs on Docker Desktop's shared folder are about 2.5x slower than on a volume: one 2025 measurement, npm, 9.5 s vs 3.6 s ([Mainardi](https://www.paolomainardi.com/posts/docker-performance-macos-2025/)). The ratio isn't published for pnpm, yarn or bun. pnpm may hard-link from its store (in `~`, the same share) where the volume forced copying.
- Large dependency trees in the Mac folder: Spotlight indexes them (`.metadata_never_index` no longer works; the Privacy list does), and Time Machine backs them up (`tmutil addexclusion` can exclude a folder). A project in an iCloud-synced folder would upload them.

**Revisit if:** installs on a real project are much slower than 2x, file watching misses edits, or a project needs Mac-side installs. The fallback is a per-project list of container-only paths in the project record, mounted as volumes; not one global rule.

Older containers keep their volume until recreated; `orca start --fresh` and `orca delete` remove it.
