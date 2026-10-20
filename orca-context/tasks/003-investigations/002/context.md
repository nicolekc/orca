# Task Context: Principle Adherence Hardening

## Problem Statement

**Discovered:** The design principles (docs/design-principles.md) encode hard-won insights from Nicole's experience with Promptly (160+ tasks). But new AI sessions won't have the FELT EXPERIENCE behind these principles. They'll read "Specification-Creativity Tradeoff" and nod along without understanding the junior-engineer-given-a-recipe analogy that makes it click.

**Why it matters:** If a new session over-specifies tasks, generates prescriptive role prompts, or adds rigid rules "for safety," it's undoing the core philosophy. The framework becomes what it was designed to avoid. See principle-adherence-risks.md co-located in this task's context folder for the three identified risks.

**What was tried:** Principles are documented. CLAUDE.md highlights the three most important ones. Knowledge files capture risks. But we don't know if this is ENOUGH weight — will a new session actually push back on an over-specified task, or just comply?

**Constraints:**
- The solution can't itself be prescriptive (that would violate P2)
- "Increasing weight" needs to be testable — can we run an experiment?
- Possible approaches: adversarial testing (deliberately over-specify and see if AI pushes back), review checklists (design reviewer checks for prescriptiveness), seed improvements (stronger principles), or structural approaches (the framework design itself makes prescriptiveness hard)

## The Three Identified Risks (from knowledge file)

1. **Loss of felt experience**: AI reads the words but hasn't lived through the pain of over-specification
2. **Default to helpfulness over restraint**: AI's training reward pushes toward doing MORE, not saying "this is too prescriptive"
3. **Framework becomes what it criticizes**: Progressive additions of "just one more rule" accumulate into the prescriptiveness trap

## Nicole's Specific Concern

She asked: "Is 'increasing weight' testable? Is this an investigation task?" — signaling she wants concrete, verifiable approaches, not just "write stronger principles."
