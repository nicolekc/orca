# PRD Refinement

Review the PRD for task description quality, sizing, and verification approach.

## Task Description Quality — The Architect Test

The most common failure in task writing is doing the architect's job. A task should make the architect THINK, not just translate.

**Two failure modes:**

1. **Under-visioned** — "Set up the project structure." No constraints, no competing concerns, no vision of what the system needs to become. The architect rubber-stamps it because there's nothing to decide.

2. **Over-prescribed** — "Use Python Protocol with AsyncGenerator yielding StreamEvent objects. Router returns RouterOutput with strategy, confidence, extracted_entities." The architect has nothing to decide because the PRD author already designed it.

**The sweet spot:** Describe the problem richly. What does the system need to do? What are the constraints that make it hard? What future needs must the architecture support? What competing concerns exist?

- BAD (under-visioned): "Create runner stubs for the 3 SDKs."
- BAD (over-prescribed): "Define a Python Protocol class with an async generator run() method that yields StreamEvent objects. Router is NOT a runner. Use an explicit registry dict."
- GOOD: "The system needs 3 runners (Claude SDK, OpenAI SDK, PydanticAI) that a CLI and web interface can consume identically. They must stream execution progress in real-time. Figure out the contract between runners and interfaces, how the router dispatches to them, and prove the architecture works with convincing stubs."

**Red flags in task descriptions:**
- Names specific classes, patterns, or data structures
- Specifies file layouts or directory organization
- Dictates communication protocols or serialization formats
- Uses words like "use", "implement with", "define a ... class"

**Green flags:**
- Describes what the system needs to DO
- Names constraints and competing concerns
- Describes what success looks like from the outside
- References future needs the architecture must support
- Asks "how should these pieces connect?" not "connect them this way"

When reviewing a PRD, check each task: **would an architect have real decisions to make?** If not, the task is either too thin or too prescribed.

## Verification Approach

Verification gets more concrete as the pipeline progresses. The PRD should NOT specify detailed test assertions — that's the implementer's job via TDD.

**What the PRD should say:** Outcomes. What does success look like from the outside?
- GOOD: "A query produces a real answer with real metrics. Can run it repeatedly and get consistent but not identical results."
- BAD: "Test submits query via POST to /api/query and asserts response contains EvalResult with non-zero token counts."

**What the PRD should NOT say:** How to test, what test framework to use, what assertions to write, specific test scenarios. The architect thinks about test strategy at a high level (systems, layers, concepts). The implementer writes actual tests via TDD.

**Check:** Does each task leave room for the architect to think about verification strategy and the implementer to practice TDD? If the task's verification section reads like a test plan, it's too prescriptive.

## Right-Sized Task
- Completable in one focused session
- Has clear "done" state
- Dependencies are explicit

## Too Big (split it)
- Has multiple distinct deliverables
- Naturally breaks into "first X, then Y"

## Too Small (merge it)
- Just a sub-step of another task
- Can't be verified independently

## Task Order

Task IDs are for REFERENCE ONLY — not execution order. Orca picks the best next task dynamically based on what's done, what makes sense, and dependencies.

If tasks have hard dependencies, note them in the `dependencies` array.

## Acceptance Criteria

Good criteria test PURPOSE, not implementation:
- "User can log in with email/password" (purpose)
- "Login form calls /api/auth endpoint" (implementation — too rigid)

Good criteria are also exercisable — they describe something you can do and observe, not just a property to check. "A query produces a real answer" is exercisable. "The code uses the correct pattern" is not.

Subjective criteria are acceptable when the problems being solved are clearly stated and core workflows are verifiable. Don't force artificial precision on inherently subjective goals.

## Implementer Trust Balance

We want the implementer to function as a senior engineer:
- Follow architectural guidance when provided
- Handle edge cases with long-term thinking
- Intuit appropriate solutions when something unexpected comes up

The way we write specs influences this — over-prescription infantilizes; under-specification lets them drift.

**The balance:**
- When architectural decisions matter, state them explicitly — expect them to be followed
- Leave room for judgment on implementation details not covered by the spec
- If a pattern was chosen to prevent a specific problem, explain why
- Call out anti-patterns when prior attempts failed
- Don't over-specify implementation details unless there's a reason

## Concrete Examples Are Valuable

Don't confuse "avoid over-specification" with "remove helpful examples." The implementer works autonomously and can't come back for clarification, so concrete starting points are valuable.

The problem is rigid framing, not examples themselves. Tentative language ("something like this should work", "one approach would be") gives the implementer a concrete starting point while leaving room to iterate.

## Output Format

For each task:
- KEEP: [task id] - [reason]
- SPLIT: [task id] into [subtasks]
- MERGE: [task ids] into [single task]
- FIX: [task id] - [what needs to change and why]

Or if all tasks are ready: "PRD is ready"
