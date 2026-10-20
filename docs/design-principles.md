# Design Principles

These principles govern the design of the framework itself. They are not instructions for AI agents — they are constraints on what we build and how we build it.

## P1: Composable, Not Monolithic

The framework is a collection of independent simple systems. Each piece is useful alone. No piece requires any other piece. Together they compose into something more powerful, but nothing breaks if you only adopt one.

This means: no "install the whole framework or nothing." No implicit dependencies between pieces. No shared state that couples unrelated concerns.

## P2: Principles Over Prescriptions

Prefer principles and examples over rigid rules. Every prescriptive "the AI MUST do X" creates a corner case where X is wrong, which generates a reactive patch, which needs more rules, which creates more corner cases. This is the **prescriptiveness trap** — the framework explodes in complexity as it tries to close every loophole.

Instead: state the principle, provide examples of good and bad, and trust the AI to apply judgment. Correct with anti-patterns after observed failures, rather than pre-empting with rigid rules.

## P3: The Specification-Creativity Tradeoff

There is an inverse relationship between the completeness of task specification and the quality of AI execution. This is counterintuitive — more detail should produce better results — but it doesn't, for the same reason it doesn't with human engineers.

When you give a trusted junior engineer the **gist** of a task, they apply creativity when they encounter obstacles you didn't anticipate. They adapt, find alternatives, and produce work that reflects genuine problem-solving. By contrast, when you give them **exact instructions in strong wording**, they follow those instructions to the letter — even when the instructions stop making sense. If you failed to anticipate every obstacle (and you always will), they'll march straight into a wall rather than walk around it.

AI has the same problem, arguably worse. A highly specified task description becomes a constraint that the model optimizes against, even when the specification conflicts with reality. The more "assume zero context" a plan becomes, the more it strips the executor of the organic understanding that produces high-quality work. Any text-based specification is inherently lossy — it cannot capture the full reasoning that led to the task, the design intuition behind it, or the judgment needed when things don't go as planned.

**The sweet spot is: enough context to understand the intent, enough trust to allow creative execution.** This means:
- Convey the *why* and the *outcome*, not the exact *how*
- Provide rich context (investigation notes, design rationale, related code) rather than step-by-step instructions
- Accept that organic development of an idea — investigation, iteration, even tangents — often produces better results than a perfectly decomposed plan
- Recognize that there is a "dumb zone" in very large contexts, but also a sweet spot where enough context enables genuine understanding

**Design implication:** Prefer context over instructions. Trust the executor. When a task is complex, give it a directory of accumulated context rather than a longer specification.

## P4: Rich Context Over Rigid Plans

Complex tasks need a space for context to accumulate naturally. When a task hits a blocker, an investigation happens, a design evolves, or a worker needs to retry — all of that context is valuable. It should live in a per-task directory, available to any worker who picks up the task.

This means:
- Each significant task can have a directory for accumulated context (investigation notes, design artifacts, debug logs, prior attempts)
- Durable context (designs, investigations, decisions) persists until the task merges to main
- Ephemeral context (debug traces, scratch work) is local to the runner and disposable
- A new agent looking at a task can get into the nitty-gritty by reading this directory

## P5: Tasks Are Re-doable

PRDs are merge gates, not auto-merge triggers. A human reviews the build, and if a task went wrong, they can select it and the AI redoes it with new feedback. Dependent tasks automatically cascade — adapting or redoing as needed.

This means the task system must support:
- Marking a task for redo (with human feedback attached)
- Tracking dependencies between tasks
- Cascading redos to dependent tasks
- Recording attempt history

## P6: Two-Directory Pattern

Framework files (perspectives, processes, templates) are **copied** from the framework repo into a project. They live in one directory and are not normally edited.

Project-specific files (overrides, knowledge, work state) are **edited** in the project. They live in a separate directory.

Overloads (e.g., project-specific additions to a perspective prompt) mirror the framework directory structure. If an overload needs to *subtract* from a framework file, that's a framework design failure — the framework file was too prescriptive.

## P7: Seed Spaces, Don't Over-Define

Create directories and bare templates that seed the right structure. Don't pre-define every category, file format, or naming convention. Let the structure grow organically as projects use it.

The framework should be descriptive enough that an AI can figure out what goes where, but not so prescriptive that it creates unnecessary constraints.

## P8: Lightning-Quick Descriptions

Every framework file that an AI will read costs tokens and attention. Descriptions must be minimal, clear, and front-loaded with the most important information. No ceremony, no announcements, no verbose explanations of things the AI already knows how to do.

## P9: No Custom Vocabulary

Use plain English. No invented terminology that users or AIs must learn. If a concept needs a name, use the most obvious word for what it is. Think Apple's naming: plain, obvious, no jargon.

Exception: "Orca" as a name for the orchestrator pattern is established and stays.

## P10: Model-Agnostic

Don't hardcode model tiers, model names, or model-specific behaviors. Today's model hierarchy will change. The framework should work with whatever model is available.

Future consideration: if Claude doesn't add automatic model switching, model routing may become a feature. But not now.

## P11: Circuit Breaker

After 3 failed attempts at the same approach, stop and question the approach. Don't keep patching. This applies to:
- An implementer stuck on the same bug
- A reviewer and implementer in a disagreement loop
- Any repeated failure pattern

The response to a circuit breaker is: escalate to a higher-level role (architect) or to the human, not "try harder."
