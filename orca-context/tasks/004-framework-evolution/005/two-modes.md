# Two Modes: PRD Execution and Enhanced Vibe Coding

Orca's principles and tools are useful in two distinct modes, not just automated PRD execution.

## Mode 1: PRD Auto-Execution

The primary mode. Orca reads a PRD, dispatches subagents, runs the build cycle, commits and pushes. The human's role is before (writing/refining the PRD) and after (reviewing the output).

## Mode 2: Enhanced Vibe Coding

The human is in the driver's seat, working interactively with Claude. Orca's principles, roles, and knowledge files enhance this session without taking over. The human might:

- Ask for an architect-style analysis before implementing
- Use the spec reviewer checklist to sanity-check their own task descriptions
- Reference design principles during a design discussion
- Use the seed's working style for quality guardrails

In this mode, Orca isn't orchestrating — it's providing tools and context that make the interactive session better. The framework files are "lying around" for the human to pick up, not a system that owns the process.

## Why Both Matter

PRD execution handles known, well-specified work. Vibe coding handles exploration, investigation, and creative problem-solving. Most real development alternates between both. The framework should support both without forcing either.
