# Research, October 2026: remote access, editors, and what else exists

**Status:** open. Findings from three research passes (2026-10-23), and the questions they
leave. Claims from vendors or secondary sources weren't independently checked.

## Where orca stands

Nothing found frames the *project* as the boundary for trust and memory: one durable local
environment with several repos plus orchestration files, its own logins and network, several
terminals sharing the setup, and a view across projects. That's orca's contribution; keep it
a thin layer of policy and grouping over standard parts, not a platform.

## Open questions

- **Credentials kept out of containers.** Anthropic's sandbox guidance: a container doesn't stop
  a hostile repo from sending out anything in it, including `~/.claude` credentials. The
  answer elsewhere is a proxy on the host that adds credentials to requests (Docker Sandboxes,
  Claude's cloud sessions). Copying logins from the Mac (decided against for `gh` and Claude
  for now) would widen what one project holds.
- **Egress allowlist per project.** Projects can't reach each other, but can reach the internet.
  Anthropic's reference devcontainer firewall is the plain-Docker way.
- **Docker Sandboxes (`sbx`) as an optional backend.** Better: a VM per sandbox, credentials
  added by a host proxy, egress allow/deny, its own Docker. Not covered: projects of several
  repos, terminals (unconfirmed), the dashboard. Proprietary. Questions before adopting: several
  Claude sessions in one sandbox; a multi-repo folder as its workspace with per-project
  logins; VS Code attach; file speed on the Mac. Keep orca's records separate from the code
  that runs containers, so a second backend stays cheap.
- **Cloud containers.** Reasons beyond remote access: work while the Mac sleeps, more compute,
  long jobs.
- **Docker's Sandbox Kit spec** (proposed to the CNCF): network policy, credentials and mounts per
  sandbox; a candidate format for a project's permission record.
- **Claude Projects** (beta): one cloud conversation coordinating threads across repos, with
  project memory. Overlaps the orchestration layer; its public material doesn't address sandboxing.
- **Agent Skills packaging of the framework** (perspectives, processes, `/orca` and the
  rest as SKILL.md skills any agent loads when relevant, replacing "read seed.md first").
  A separate goal.

## Remote access

- **Use Claude's Remote Control** (`claude --rc`, `/rc`, or `remoteControlAtStartup` in a
  project's `~/.claude/settings.json`), driven from the Claude app or claude.ai/code. It's
  outbound only, so it works from a container with nothing forwarded. Needs a full claude.ai
  login in the project (not a setup token). `claude remote-control --spawn worktree` in its own
  terminal lets the phone start new sessions.
- Done: sessions are named after the project, and cross-session messages between projects are
  refused (container-features.md).
- To do yourself: Trusted Devices and a passkey on claude.ai (anyone signed in controls YOLO
  containers); keep the Mac awake (`caffeinate`, energy settings).
- Later: the dashboard over Tailscale Serve, for starting projects while away (the dashboard's
  host check would need its hostname). SSH plus `docker exec` for a raw terminal.
- No custom remote server: it would add an inbound path next to untrusted containers.

## Editors (September transcript)

- The complaints: child repos invisible to search and quick-open from the top-level folder; a
  separate Terminal window doesn't feel like an IDE.
- A multi-root `.code-workspace` (each repo its own root) fixes search per repo, in VS Code or
  Cursor. Cursor's own index has the same blind spot for child repos.
- Editor on the Mac: search and autocomplete work, language servers use the Mac's tools.
  Attached to the container: everything inside, and Claude's editor link works. Don't bridge a
  Mac-side editor to a container's Claude: it crosses the trust boundary.
- Cursor's main loss would be Tab autocomplete. Agent-neutral options: Copilot Free (2,000
  completions a month), Copilot Pro ($10), a local model via `llama.vscode`. Cursor's plans
  changed in October 2026, so cancelling may be one-way: trial first.

## Sources

Remote Control, cross-session messaging, sandbox environments, managed settings, terminal
config: code.claude.com/docs/en/{remote-control, cross-session-messaging, sandbox-environments,
managed-settings, terminal-config}. Docker Sandboxes: docs.docker.com/ai/sandboxes/. Sandbox
Kit: docker.com/blog/docker-sandbox-kit-spec-cncf. Cursor: cursor.com/pricing, its forum
threads on sub-repo indexing. Copilot: github.com/features/copilot/plans.
