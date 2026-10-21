# User Preferences — Orca

Standing requirements from Nicole, adapted from her general web-project preferences where Orca differs. Read in full before making decisions these govern. The build goal can override them.

## Stack

- Orca's tooling (the `orca` command, its web server, later the Mac app's server) is all TypeScript, compiled with Bun into one file per platform. This replaces the general preference for a Python backend: one language, with types shared between the command, the server and the web app. (Decided 2026-10-21.)
- Web UI: shadcn for components. The frontend framework is the builder's call, chosen for this kind of app (a local dashboard served by the compiled `orca` file); TanStack Start is the general default elsewhere.
- Container runtime calls go through the `docker` command, in one place, using flags Podman also accepts.

## Dependencies

- Package managers never install versions published less than a week ago (protection against compromised releases). Configure this in the repo, not per machine.

## Data & state

- State lives in plain files under `~/.orca`, readable and removable by hand ("more like git than like an app"). Use something sturdier only when a feature needs it.
- Browser local storage only for ephemeral UI preferences. Everything else is persisted.

## Dev workflow

- Very easy to build, test, run and reset: a Makefile for the repetitive actions.
- Two environments: development happens inside an Orca container, with `/workspace` mounted from the Mac; the `orca` command runs on the Mac. Builds and installed dependencies from one must never clobber the other's (separate `node_modules`, separate build output per platform).
- Follow TDD.

## Interfaces

- Design every interface, including the command line, with `.orca/perspectives/ux-designer.md`: decide what each screen has to communicate before building it.
- Prefer one coherent tool over a growing set of scripts. Scripts are for one-time jobs (like migration); the `orca` command is for ongoing work.
- Configuration should be visible and explainable later; avoid setups that work invisibly and get forgotten.
- Brevity in agent-facing text: less room for misinterpretation through omission.

## Judgment

- Don't let anything here prevent smart decisions.
