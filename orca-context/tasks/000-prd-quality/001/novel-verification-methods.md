# Novel Verification Methods

When you can't verify something with existing infrastructure, that's a problem to solve, not a reason to skip verification.

## The Pattern

1. What am I trying to verify? (behavior, not implementation)
2. Why can't I verify it? (missing tool, no access, no visibility)
3. What would give me visibility? (logs, mocks, simulation, proxy)
4. Build that.

## Examples of This Thinking

- "I need to verify database behavior" → "I can't run SQL" → "I need a real database" → embedded-postgres
- "I need to verify UI behavior" → "I can't see the browser" → "I need to interact with real DOM" → Playwright
- "I need to verify LLM receives correct context" → "I can't call real API" → "I need to see what I'm sending" → echo mock
- "I need to verify the orchestrator dispatches correctly" → "I can't run the full loop" → "I need to see what subagents receive" → dispatch logging / dry-run mode

When you encounter something new, apply this pattern. The solution might not exist yet — invent it. This is meta-cognitive: not "here are your tools" but "here's how to recognize you need a tool and create one."

## When to Spin Off vs. Do Inline

| Do Inline | Spin Off |
|-----------|----------|
| Small, one-off verification need | Reusable infrastructure |
| < 30 minutes of work | Substantial effort |
| Only needed for current task | Needed for multiple future tasks |
| You understand the solution | You need to investigate first |

When spinning off a verification infrastructure task, create it as a new task in the PRD with clear acceptance criteria. The current task can depend on it if blocking, or proceed with manual verification if non-blocking.
