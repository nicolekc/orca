# Task Context: Testability Foundations

## Problem Statement

**Discovered:** The framework is made of prompt files, a skill definition, directory conventions, and an orchestrator. None of these are "code" in the traditional sense — there's no function to unit test, no API to integration test. But the framework MUST be verifiable or we can't trust it.

**Why it matters:** Without testability, every subsequent task is building on an unverified foundation. Nicole explicitly flagged this as THE foundation — nothing else should proceed until we know we can verify the framework's behavior. This comes from her experience on Promptly where 160+ tasks were built on unverified assumptions.

**What was tried:** The Novel Verification Methods pattern was developed specifically for this problem (see orca-context/tasks/000-prd-quality/001/novel-verification-methods.md). The meta-cognitive approach: what are we verifying → why can't we verify it with existing tools → what would give us visibility → build that.

**Constraints:**
- Don't over-engineer the test infrastructure — apply the "do inline vs spin off" table from Novel Verification Methods
- Tests need to actually EXERCISE implementation, not just check existence (hard-won lesson from PRD_REFINE.md)
- The framework is unusual enough that the test approach itself needs design, not just implementation

## Key Mechanisms to Verify

1. **Orchestrator dispatch**: Does /orca correctly dispatch subagents via the Task tool? A dry-run or logging mode would help.
2. **Role prompt behavior**: Do role prompts produce the expected KIND of output? (Architect produces approach not code, reviewer produces verdict not implementation)
3. **Build cycle termination**: Does the circuit breaker trigger at 3 rounds? Do signoff gates stop at the right phase?
4. **Self-installation correctness**: Does framework/ → .orca/ produce identical copies? (diff -r is a trivial check but validates the install mechanism)

## Design Decision Context

Nicole specifically warned against mock tautologies and existence-only tests (these are anti-patterns from PRD_REFINE.md section on "Tests Must Exercise Implementation"). The test infrastructure should be the MINIMUM needed, but must actually verify behavior, not just structure.
