# Design Philosophy: What This Framework Is and Isn't

## What It Is

A collection of **tools lying around** ready to make agents more skilled when deployed. Think of it as a toolkit on a workbench, not a machine you turn on.

Each piece (a role prompt, a process description, a convention) works independently. An architect role prompt is useful even without Orca. The build cycle process works even without the full role set. The seed works without anything else.

## What It Isn't

This is NOT:
- A worker management system (no always-on dispatch, no agent lifecycle management)
- A comprehensive agent framework (no attempt to cover every scenario)
- An orchestration platform (Orca is one tool, not the center of the system)

## The Specific Agentic Execution We DO Support

Limited to scenarios where something wouldn't otherwise be possible:
1. **Orca orchestrator** — for subscription plan users who can't use bash wrapper executors
2. **Parallelization** — dispatching independent tasks in parallel when the platform doesn't do this automatically
3. **Adversarial review/validation** — architect-implement-review loops where different "perspectives" challenge each other
4. **Design review round tables** — multiple reviewer roles providing different perspectives on a design

Everything else: let Claude Code (or whatever tool the user has) handle it natively. Don't reinvent what the platform already does.

## The Promptly Experience

This framework exists because of 160+ tasks of AI-assisted development on the Promptly project. Key lessons:

1. **Bad foundations compound.** The first tasks set patterns that propagate through everything that follows. Get the principles right FIRST.

2. **Over-specified PRDs produce worse code.** When tasks are prescriptive about implementation, the AI follows blindly past obstacles. When tasks describe outcomes and provide rich context, the AI solves problems creatively.

3. **The bash wrapper worked but had limits.** `orca-loop.sh` with `claude -p` works great for API users. But on subscription plans, you need subagent-based orchestration within an interactive session.

4. **Review gates catch problems early.** Having separate roles for architecture and code review prevents the common failure of diving into code before understanding the problem.

5. **State management is critical.** Progress files, handoffs, and per-task context prevent information loss across sessions and agent restarts.

## Nicole's Key Principles (from direct experience)

These are not abstract — they come from debugging real failures:

- "The more complete the task description, often the worse results" — P3 in action
- "I want tools lying around, not a worker system" — the framework's scope
- "I only run --dangerously-skip-permissions inside Docker" — safety principle
- "I want principles pure enough for eventual cloud deployment" — no Docker-specific coupling
- "If I went in and started giving rough-draft tasks, would it be prepared to take over?" — the test of good documentation
