# Execution Strategies

Orca can run in two modes. Both share `.orca/orca.md` as the single source of truth for core instructions (startup, roles, execution invariants, branch/PR). Mode-specific behavior is handled by thin wrappers.

## Subagent Mode (Subscription Plan)

For interactive Claude sessions (Claude Max subscription). No bash wrapper needed.

1. Start a Claude Code session in your project
2. Run `/orca orca-context/prds/your-feature.json`
3. The `/orca` skill points Orca to `.orca/orca.md` (core instructions) plus the subagent-mode section within it
4. Each perspective (planner, architect, implementer, code-cleaner, etc.) is a subagent with clean context
5. Orca coordinates, commits, and pushes when done

**Advantages:** Works on subscription. Clean context per task. Interactive -- you can interrupt.

**Setup:** Install the framework to your project (`install.sh` copies `.orca/`, `.claude/skills/`, and scaffolds `orca-context/`).

## Bash Loop Mode (API / Docker)

For headless execution in Docker containers. Uses `claude -p` (print mode).

1. Enter the Docker container: `orca-start.sh /path/to/project`
2. Run: `./orca-loop.sh prds/your-feature.json 20`
3. Each iteration reads `ORCA_PROMPT.md` (a thin wrapper that points to `.orca/orca.md`) and completes one pipeline step
4. Loop continues until all tasks done or max iterations reached

**Advantages:** Unattended. Can run overnight. Docker isolation.

**Setup:** Build the Docker image, install to project, authenticate inside container.

## Choosing

| Factor | Subagent Mode | Bash Loop Mode |
|--------|---------------|----------------|
| Plan | Subscription (Max) | API key |
| Supervision | Interactive | Unattended |
| Context | Clean per subagent | Clean per iteration |
| Cost model | Rate-limited messages | Per-token billing |
| Docker required | No | Yes |
| Core instructions | `.orca/orca.md` | `.orca/orca.md` (via `ORCA_PROMPT.md`) |
