# Problem Statement Structure

When a task describes a problem to solve, structure it so the implementer understands the full picture without over-prescribing the solution.

## Four Parts

1. **What was discovered** — The concrete observation. What did you see? What broke? What's missing?
2. **Why it matters** — The impact. Who is affected? What can't they do? What goes wrong if we don't fix this?
3. **What was tried** — Prior attempts, if any. What worked partially? What failed and why? This prevents re-treading the same ground.
4. **Constraints** — What solutions are NOT acceptable? What must be preserved? What external systems or contracts can't change?

## Why This Works

It gives the implementer enough context to make good decisions without dictating the solution. The "what was tried" section is especially valuable — it's the difference between a fresh problem and one with history.

## Anti-Pattern

Don't disguise a solution as a problem statement. "The problem is we need to add a Redis cache" is not a problem — it's a solution. The problem is "API responses take 3 seconds because we hit the database on every request."
