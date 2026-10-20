# Approach: Rewrite PRDs 000-004 to be Outcome-Only

## Analysis Summary

I read all five PRDs (000-004) and all their task context files. The core issue: task `description` fields mix "what outcome is needed" with "how to achieve it." The `outcome` and `verification` fields are generally fine -- the prescriptive content lives primarily in `description`.

Some PRDs are worse than others. PRD 000 is already mostly outcome-focused. PRDs 001 and 002 are the most prescriptive, with numbered implementation steps, specific file paths, and technical recipes embedded in descriptions. PRDs 003 and 004 are moderate -- they have some prescriptive hints but are closer to outcome-only already.

## Per-PRD Assessment

### PRD 000 (prd-quality.json) -- Task 001

**Prescriptive content in description:**
- References specific pattern files: `success-criteria-format.md`, `novel-verification-methods.md`
- Describes the method: "Apply the success-criteria-format.md pattern (who does what, what happens, how you observe it)"
- Specifies output location: "produce a document with current vs proposed"

**Assessment:** Mildly prescriptive. The references to knowledge files are useful context (not implementation steps), but "Apply the X pattern" is telling the architect HOW to evaluate criteria. The output format ("current vs proposed side-by-side") is borderline -- it's more about deliverable shape than implementation.

**What to change:** Remove the method prescription ("Apply the X pattern"). Keep the intent: verification criteria across PRDs 001-004 need strengthening. The knowledge file references should move to durable context since they're helpful hints, not requirements.

**Context to extract:** The specific pattern references (success-criteria-format.md, novel-verification-methods.md) and the method suggestion belong in `orca-context/tasks/000-prd-quality/001/` -- but they're already there. No new extraction needed.

### PRD 001 (001-foundation.json) -- 3 Tasks

**Task 001 (Testability Foundations):**
- Prescriptive: "Apply the Novel Verification Methods pattern (see orca-context/tasks/...)" -- tells HOW to think about the problem
- Prescriptive: Numbered list "(1) Does /orca correctly dispatch subagents? (dry-run or logging mode) (2) Do role prompts produce..." -- specifies specific mechanisms to test AND suggests implementation approaches (dry-run, logging mode)
- Prescriptive: "Don't over-engineer the test infrastructure -- apply the 'do inline vs spin off' table"
- The outcome and verification fields are fine.

**Task 002 (Update install.sh):**
- Heavily prescriptive: "It needs to: (1) copy framework/ contents into target's .orca/, (2) create orca-context/ and .orca-tasks/ with bare structure, (3) copy .claude/skills/ (orca, discover, refine), (4) handle self-installation..."
- Prescriptive: "The existing PRD_REFINE.md content is valuable -- preserve it in the framework"
- Prescriptive: "Backward compat with old layout is NOT required"
- The numbered steps are implementation recipe. The backward compat note and PRD_REFINE.md note are valuable constraints/context.

**Task 003 (Legacy Cleanup):**
- Prescriptive: Lists specific files -- "root templates/ directory (old .claudeignore, CLAUDE.md.template, UI_TESTING.md, progress.txt.template, .git-hooks/)"
- Prescriptive: "and .claude/skills/refine/ references the old PRD format (testsPassing, numeric task IDs)"
- Prescriptive: "Audit each artifact -- preserve any valuable content by integrating it into the right framework location, then remove the old files"
- The specific file inventory is implementation detail. The principle (don't lose content, remove dead weight) is the actual outcome.

### PRD 002 (002-core-loop.json) -- 3 Tasks

**Task 001 (Test /orca E2E):**
- Prescriptive: "Run /orca on a small test PRD (NOT a bootstrap PRD -- create a dedicated 2-3 task test PRD)"
- Prescriptive: "Verify: subagents dispatch correctly via Task tool, architect/implementer/reviewer cycle produces actual output, task state updates, .orca-tasks/ gets populated, circuit breaker works if reviewer keeps rejecting, signoff gates work"
- The test methodology is prescriptive but the verification criteria in the `verification` field are appropriately outcome-focused.

**Task 002 (Validate Spec Review Gate):**
- Prescriptive: "run a spec review on the test PRD from task 001. Intentionally include a vague criterion and verify the reviewer catches it"
- Prescriptive: "Also verify progress.txt gets populated correctly during the build cycle with timestamped, per-role entries"
- Prescriptive: "Adjust conventions based on what actually works"

**Task 003 (Branch/Push Hygiene):**
- Prescriptive: "How does orca name branches? How does it handle existing branches?"
- Mildly prescriptive: "one branch per PRD execution is probably enough"
- The description reads more like a design exploration brief with light hints. Moderate cleanup needed.

### PRD 003 (003-investigations.json) -- 8 Tasks

**General pattern:** These are investigation tasks. Most are already fairly outcome-focused since investigations naturally describe WHAT to explore. The main prescriptive elements are:
- Specific output locations: "Produce findings in orca-context/designs/" (tasks 001, 006)
- Method suggestions: "Research approaches: summary file, specific directory, PRD status integration" (task 003)
- Task 006 has detailed design requirements embedded in description ("filesystem-native pattern where: (1) the agent recognizes... (2) the task is parked... (3) orca continues... (4) when the human responds...")
- Task 008 has detailed scope lists ("Scope includes: the framework root directory name, all subdirectories...")

**Assessment:** Investigations are inherently lighter on prescription since the deliverable IS a document. The main cleanup is removing method suggestions and letting the architect decide approach. Task 006 and 008 have the most embedded implementation detail.

### PRD 004 (004-framework-evolution.json) -- 9 Tasks

**Task 001 (Knowledge Integration Proposal):**
- Prescriptive: "Review the knowledge files now distributed across task contexts (design-philosophy.md, frameworks-research.md in this task's context folder; success-criteria-format.md and problem-statement-structure.md in 000-prd-quality/001/) and PRD_REFINE.md"
- Prescriptive: "For each piece of knowledge, propose: which framework file(s) it belongs in..."
- Lists specific files to review and a specific methodology.

**Task 002 (Design Docs):**
- Prescriptive: "(1) The Seed, (2) The Knowledge Convention, (3) The PRD Format, (4) The State System, (5) Role Definitions, (6) The Orchestrator Pattern"
- Prescriptive: "Each ~1 page in orca-context/designs/"
- Specifies the exact six topics and format.

**Task 003 (Role Adaptation):**
- Prescriptive: "Focus on Gas Town (MIT) for engineering quality. See orca-context/tasks/.../role-adaptation-notes.md"
- Prescriptive: "Consider: systematic debugger, investigator role, design review panel process"
- Method and specific source suggestions.

**Task 004 (Docker Multi-Repo):**
- Prescriptive: "Current orca-start.sh assumes one container = one repo. See orca-context/tasks/.../docker-multi-repo.md"
- Prescriptive: "Also document multi-level installation pattern"
- References specific files and suggests implementation approach.

**Task 005 (Two-Mode Design):**
- Mostly outcome-focused. References "two-modes.md in this task's context folder" which is an appropriate context reference.

**Task 006 (README):**
- Prescriptive: "describe the six project primitives (Seed, Knowledge Convention, PRD Format, State System, Role Definitions, Orchestrator Pattern)"
- Prescriptive: "explain what the framework IS in plain language, and show how to adopt parts of it without buying the whole thing"
- Prescriptive: "Should be informed by the naming/organization audit (003/008) and the six design docs (004/002)"
- Lists specific content requirements and cross-references.

**Task 007 (Install Process):**
- Prescriptive: "(1) audit what install.sh currently does vs what it should do, (2) design the install experience end-to-end..., (3) implement it"
- Prescriptive: "Consider: should install be a script, a CLI command, an interactive wizard?"
- Numbered implementation steps and method suggestions.

**Task 008 (Blog Post):**
- Prescriptive: "tell the story -- the 160+ tasks that led here, the frameworks that were tried and rejected..."
- Prescriptive: "Think Gas Town's 'Welcome to Gas Town' post but for this framework's philosophy"
- Content direction is appropriate for a creative brief; this is closer to outcome than prescription.

**Task 009 (QA Engineer Role):**
- Prescriptive: "Design the kickback mechanism as a general pattern: a role declares what role it kicks back to, the process handles the loop (max 3 rounds, then blocked)"
- Prescriptive: "Implement the qa-engineer perspective and update processes/prd.md with the kickback loop rules. Move qa-engineer from 'future roles' to 'active roles' in orca.md when done."
- Implementation steps and specific file changes.

## Approach

### Rewriting Strategy

For each task description, apply this filter:

1. **Keep:** The problem statement (what's wrong / what's needed), the outcome intent, constraints that affect correctness (not method).
2. **Remove:** Numbered implementation steps, specific file paths to create/modify, method suggestions ("Apply X pattern", "Consider Y approach"), tool/technique prescriptions.
3. **Move to durable context:** Implementation hints that would genuinely help an architect -- specific file inventories, cross-references to related knowledge, design decisions already made. These go into the existing `orca-context/tasks/<prd>/<task>/context.md` files (most already exist and contain this kind of detail).

### What Counts as Prescriptive

A clear line: if a description tells you WHAT files to touch, WHAT steps to follow, or WHAT method to use, it's prescriptive. If it tells you WHAT should be true when you're done, it's outcome. Some borderline cases:

- "Backward compatibility is NOT required" -- This is a **constraint**, not prescription. Keep it.
- "See X file for context" -- This is a **reference**, not prescription. Move to durable context.
- "One branch per PRD execution is probably enough" -- This is a **hint**, not prescription. Move to durable context.
- "Create a dedicated test PRD" -- This is **method**, not outcome. Remove from description; the outcome is "the loop works end-to-end."

### Context Extraction Plan

Most tasks already have context files in `orca-context/tasks/`. The extraction is:

1. **PRD 000, Task 001:** Context already has the right detail. No new extraction needed. Just trim the description.
2. **PRD 001, Tasks 001-003:** Context files already exist and contain the implementation detail. Trim descriptions to outcomes; context files serve the architect well as-is.
3. **PRD 002, Tasks 001-003:** Context files exist. Some prescriptive detail from descriptions should be added to context (e.g., the specific mechanisms to test in 002/001). Trim descriptions.
4. **PRD 003, Tasks 001-008:** Most are already close to outcome-only. Light trimming. Tasks 006 and 008 need the most work -- extract the detailed requirement lists into context.
5. **PRD 004, Tasks 001-009:** Moderate trimming across the board. Tasks 002, 007, and 009 need the most work. Extract specific file lists, numbered steps, and method suggestions to context.

### Preserving Human Checkpoints

Each PRD's top-level `description` field contains a "Human checkpoint: ..." sentence. These stay. They describe the outcome gate, not implementation method.

### What Stays in `outcome` and `verification` Fields

These are generally already well-written. I'll review them but expect minimal changes. The `verification` fields occasionally reference specific file paths ("Document exists in orca-context/designs/") -- this is borderline but acceptable since it specifies WHERE to look for the deliverable, not HOW to create it.

### Scope of Changes

- **5 PRD JSON files** modified (descriptions trimmed)
- **0-5 context files** in `orca-context/tasks/` updated with extracted implementation hints (only where the existing context doesn't already capture the detail)
- No new files created beyond this approach document

### What the Implementer Needs to Know

1. Edit task `description` fields in each PRD JSON to remove prescriptive content per the analysis above.
2. For any implementation hints removed from descriptions that aren't already captured in the corresponding `orca-context/tasks/<prd>/<task>/context.md`, append them to those context files.
3. Do NOT change `outcome`, `verification`, `dependencies`, `status`, or `pipeline` fields.
4. Do NOT change PRD-level fields (`name`, `description`, `signoff`).
5. Validate: after changes, re-read each description and confirm it answers "what should be true when this is done?" without answering "how do I make it true?"
