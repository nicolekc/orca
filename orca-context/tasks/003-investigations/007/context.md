# Task Context: Preserving Architectural Intent

## Problem Statement

**Discovered:** During a design session, Nicole described her vision for the task parking mechanism (003/006). The description included tactical requirements (filesystem artifacts, loosely-coupled design) AND a statement of architectural intent: "I want the underlying file system to support this in a native and loosely-coupled, tightly cohesive manner." The session captured this as a verbatim quote in a "Nicole's Vision" section of the task context, with an interpretation of what it meant for the investigation.

When Nicole saw this, she recognized something important: the quote carried more weight than any paraphrase could. The precise phrase "loosely-coupled, tightly cohesive" constrains the design space in a way that a requirements list doesn't. She asked how to get this kind of preservation systematically — without being prescriptive about it.

**Why it matters:** A future runner can satisfy every listed requirement and still miss the point. Requirements say WHAT to build. Architectural intent says WHY it matters and WHAT IT SHOULD FEEL LIKE. When a human says something with conviction about the underlying philosophy — not the feature, but the design principle driving the feature — losing that means the runner designs the right artifact format but misses the architectural intent.

This is related to but distinct from principle adherence (003/002). Principle adherence is about following the framework's established principles. This is about recognizing and preserving NEW intent expressed by the human during task creation — the moments where the human's reasoning is the most valuable context the runner could have.

**What was tried:** The "Nicole's Vision" section in 003/006's context worked well as a one-off. But it was a judgment call by the session, not guided by the framework. The framework doesn't currently tell runners: "when the human states something with conviction about WHY, preserve it differently than requirements."

**Constraints:**
- The solution CANNOT be a rigid template ("every task must have a Vision section") — that would produce empty boilerplate
- It should guide recognition, not mandate format — the runner needs to recognize high-signal human reasoning and preserve it, not fill in a form
- It may already be partially addressed in existing framework files (seed principles, role prompts, task context conventions) — audit before proposing new things
- The investigation should distinguish between: (a) intent that belongs verbatim in context, (b) intent that belongs as a design constraint, (c) intent that's already captured by requirements and doesn't need separate treatment

## The Originating Story

During this session, a task context file (003/006) was written that included a section called "Nicole's Vision" with a direct quote and interpretation. Here's what happened and why:

1. Nicole described the task parking mechanism with a mix of tactical needs and architectural vision
2. The session recognized that her quote — "I want the underlying file system to support this in a native and loosely-coupled, tightly cohesive manner" — said something the requirements didn't
3. The quote was preserved verbatim with context about why it mattered
4. Nicole noticed this and asked what caused it

The answer was: the quote was better as a quote than as a paraphrase. It carried design philosophy weight that would be diluted by restructuring into requirements. The session recognized this because it had internalized (from this conversation) that Nicole cares about preserving felt experience behind decisions.

The key insight: **when someone says something that's better as a quote than as a paraphrase, that's the signal that architectural intent is present.** The question for this investigation is: can the framework help runners recognize that signal?

## Questions for the Investigation

1. Does the framework already guide this anywhere? (Check seed, roles, task context conventions, problem-statement-structure.md)
2. Where would guidance naturally live? (Spec reviewer? Task context conventions? A note in the PRD format?)
3. How do you teach recognition without prescription? ("Look for X" vs "always include section Y")
4. What's the risk of over-formalizing this? (Boilerplate "vision" sections that say nothing)
5. Is there a relationship to P3 (Specification-Creativity Tradeoff)? Intent preservation is a form of rich context that guides without prescribing.
