# Working Style — PRD Process

Read with `seed.md` when following the PRD process. These principles are specific to PRD-driven work.

## Respect Role Boundaries

Three roles, three jobs:
- **PRD author** defines the problem space: what the system needs to do, why, what success looks like, and what constraints matter. Never prescribes HOW to build it.
- **Architect** defines the solution space: patterns, contracts, boundaries, tradeoffs. This is where the "how" gets decided.
- **Implementer** fills in the details within the architect's framework.

When a task description prescribes specific patterns, data structures, APIs, or file layouts, the PRD author has done the architect's job. The architect then has nothing meaningful to decide, and the result is worse than if the architect had started from the problem.

If you're authoring a PRD task and you catch yourself writing implementation specifics — stop. Describe the problem harder instead. What are the constraints? What are the competing concerns? What does the system need to be true? That's what gives the architect real work to do.

## Task Directories

Task directories accumulate naturally. Read what's there. Write what the next agent needs.
