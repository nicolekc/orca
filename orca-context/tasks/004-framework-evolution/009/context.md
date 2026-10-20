# Task Context: QA Engineer Role and Kickback Loops

## Problem Statement

**Discovered:** The framework currently has design-reviewer→architect kickback, but no equivalent for implementation quality. The old code-reviewer role was opinion-based (review the code, decide if it's good). The qa-engineer replaces this with test-based verification — actually running tests and proving the implementation works, rather than reviewing code for style or correctness opinions.

**Why it matters:** Code review is a weak verification signal. Test execution is a strong one. The qa-engineer makes the build cycle's quality gate actually trustworthy.

**Current state:**
- Only design-reviewer can kick back (to architect)
- The kickback pattern is not generalized — it's specific to design-reviewer
- qa-engineer is listed as a future role in orca.md

**Design intent:**
- The kickback mechanism should be a general pattern: any role declares what role it kicks back to, the process handles the loop
- Max 3 kickback rounds before marking the task as blocked (circuit breaker)
- Both design-reviewer→architect and qa-engineer→implementer should use the same underlying pattern
