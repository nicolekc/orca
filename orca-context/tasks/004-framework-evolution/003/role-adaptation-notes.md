# Role Prompt Adaptation Notes

## Sources Worth Mining (all MIT)

### Gas Town (Steve Yegge)
Best source for engineering quality principles. Yegge was a Google engineer and has been a software engineering philosopher for 20+ years. His role templates are in `internal/templates/roles/` in the gastown repo.

Key roles to study:
- `mayor.md.tmpl` — The coordination philosophy (don't implement, dispatch, decide fast)
- Look for any architect/quality-related roles

The metaphorical language (steam engines, polecats) should be stripped, but the engineering judgment encoded in the roles is valuable.

### OMC
- `architect.md` — "Strategic Architecture & Debugging Advisor" — read-only, evidence-based. Our architect already adapts this.
- `critic.md` — "Plan Review Specialist" — validates plans before execution. Related to our spec-reviewer.
- Tool restrictions per role is a good pattern (architect can't write, executor can't spawn agents).

### Superpowers
- Systematic debugging skill (4 phases) — worth adapting as a lightweight process
- The "plans assume zero context" insight is GOOD for writing task descriptions, but BAD if taken to mean "strip all context." The distinction: write clearly enough that someone without context CAN understand, but also provide the rich context so they don't HAVE to rely only on the description.

## Roles We Have
- architect.md — analyze, recommend, don't implement
- code-reviewer.md — two-stage: correctness then quality
- design-reviewer.md — structural review, prescriptiveness trap detection
- spec-reviewer.md — task definition quality

## Roles We May Want
- **Systematic debugger** — adapted from Superpowers' debugging skill. For when a task hits repeated failures.
- **Investigator** — for pure research tasks. Read code, understand behavior, produce findings. No implementation.
- **Design review panel** — not a single role, but a PROCESS where multiple perspectives (architect, design-reviewer, and optionally domain-specific overrides) review a design document together.

## Principles for Writing Roles
- Each role fits on ~1 page (P8: lightning-quick)
- State what the role DOES, briefly what it DOESN'T (P2: principles not prescriptions)
- Don't prescribe exact outputs — describe what good output looks like
- Role prompts should work standalone (P1: composable)
