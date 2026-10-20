# Task Context: Naming Audit

## Problem Statement

The framework's directory names and concepts were named quickly during initial development. Several are confusing, ambiguous, or carry the wrong connotation. Nicole flagged these specifically:

### Items to Audit

| Current Name | Problem |
|---|---|
| **orca-context/** | Sounds like orca's internal state. It's actually the framework's entire working directory — PRDs, tasks, designs, knowledge, overrides. The name implies it's subordinate to orca, but it IS the framework. |
| **tasks/** | Ambiguous. Could mean runtime task execution, or the task context folders that live here. These are really task *contexts* (supplementary materials for each task), not the tasks themselves (those are in the PRD JSON). |
| **knowledge/** | Vague. Knowledge about what? This is meant for accumulated learnings — things discovered during execution that should persist. But "knowledge" could mean anything. |
| **overrides/** | Overrides to what? Currently holds role overrides. But the name doesn't communicate what's being overridden or why. |
| **overrides/roles/** | Actually fairly clear, but only in context of knowing what overrides/ means. |
| **designs/** | Reasonably clear. Investigation outputs and design documents land here. |
| **prds/** | Clear if you know the acronym. Might be opaque to someone new. |
| The project name | Currently "orca-docker" because that's the test repo. Not relevant to the framework itself, but worth noting: the framework needs a name that isn't tied to a specific host project. |
| **.orca** vs **orca-context** | Should the framework root be a dotfile? Dotfiles signal "config/hidden." A visible directory signals "this is part of the project." Which is right? |
| **.tasks** | Nicole mentioned this as another option for the tasks directory. Dotfile convention would hide it from casual `ls`. |

### Beyond Names: Is the Organization Right?

This isn't just a rename exercise. The current directory *structure* may also be wrong. Questions to consider:

- **Should prds/ be top-level?** Currently nested inside orca-context/. But PRDs are the primary human-facing artifact — maybe they deserve top-level visibility instead of being buried inside a framework directory.
- **Is the nesting depth right?** orca-context/tasks/003-investigations/008/ is four levels deep. Is that too deep? Would flatter be better for discoverability?
- **Are things grouped correctly?** designs/ and knowledge/ are siblings, but they serve very different purposes. tasks/ and prds/ are siblings but one is the source of truth and the other is supplementary context.
- **Too many artifacts sprinkled around?** Visibility is good, but scattering things across the tree makes it hard to know where to look. What's the right balance?

### What This Investigation Should Cover

1. **Audit every named directory** in the framework root and one level deep
2. **Question the organization** — not just names, but whether the nesting and grouping is correct
3. **Propose 2-3 coherent schemes** — each covers BOTH names and structure (don't just rename a bad structure)
4. **Consider the audience**: a new developer encountering this directory for the first time, a runner (AI agent) navigating by convention, a human reviewing work
5. **Flag breaking changes**: which renames/moves would require updating seeds, role prompts, PRD references, and framework code? Which are cosmetic (no references to update)?
6. **The dotfile question**: should the framework root be hidden (`.orca`, `.framework`) or visible (`orca-context`, `project-context`)? What are the tradeoffs?
7. **Recommend one scheme** with honest rationale

### Naming Principles to Consider

- Names should be self-documenting to someone who has never seen the framework
- Names should be unambiguous — a name that could mean two things will eventually be misunderstood
- Internal consistency matters more than any individual name being perfect
- Shorter is better, but not at the cost of clarity
- The framework may eventually be used in projects that have nothing to do with "orca" — names shouldn't be orca-specific unless they refer to orca itself
