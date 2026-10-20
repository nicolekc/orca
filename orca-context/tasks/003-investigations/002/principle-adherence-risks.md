# Principle Adherence Risks

Risks identified during the initial design session (2026-02-12). These need ongoing attention as the framework develops.

## Risk 1: Loss of "Felt Experience"

The design principles document captures WHAT we decided and WHY. But a new AI session reading these principles won't have the *felt experience* of iterating through the discussion that produced them. It will read "the prescriptiveness trap" as a concept, but not feel the weight of it the way the original designers did.

**Symptoms to watch for:**
- Adding "MUST do X" rules that weren't discussed or justified
- Creating new role prompts that are more prescriptive than the existing ones
- Expanding the framework's scope beyond "tools lying around"
- Over-engineering solutions where simplicity would serve

**Mitigation:** Review every new framework file against P2 (Principles Over Prescriptions) and P8 (Lightning-Quick Descriptions). If a file is getting long or rigid, it's probably drifting.

## Risk 2: Default to Helpfulness Over Restraint

AI defaults to being helpful — adding features, cleaning up code, creating abstractions. The framework's principles call for restraint — stay in scope, don't over-engineer, three lines is better than an abstraction. A new session given rough-draft tasks may default to its helpful nature rather than the restraint the principles demand.

**Symptoms to watch for:**
- Adding tests/docs/types to code that wasn't changed by the task
- "Improving" existing framework files beyond what was asked
- Creating new roles, processes, or conventions that weren't requested
- Making the framework structure more complex than necessary

**Mitigation:** The code reviewer role should specifically check for scope creep. The spec reviewer should flag tasks that invite over-engineering. The seed's "Stay in Scope" section is the first defense.

## Risk 3: Framework Becomes What It Criticizes

The biggest risk: as we add roles, processes, conventions, and tools, the Orca framework gradually becomes another OMC/Superpowers/Gas Town — a monolithic all-or-nothing system with too many rigid pieces.

**Symptoms to watch for:**
- The framework has more than ~10-15 files total
- New features require modifying multiple framework files to stay consistent
- The install process becomes complex
- CLAUDE.md grows beyond ~100 lines
- Someone needs to "learn the framework" before using it

**Mitigation:** Regularly ask: "Could I delete this file and everything else still works?" If the answer is no, we've created coupling. P1 (Composable, Not Monolithic) is the test.

## Action Items

These risks should be:
1. Referenced by the design-reviewer role when reviewing framework changes
2. Checked periodically (every ~5 PRDs?) as a health check
3. Updated with new risks as they're discovered (this file is append-only)
