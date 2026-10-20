# Success Criteria Format

How to write acceptance criteria that actually verify behavior.

## The Problem

Vague criteria like "Build chat interface" are not verifiable. They describe a feature, not an outcome. An implementer can interpret them many ways, and a reviewer can't objectively determine if they're met.

## Good Criteria Are Assertions

Each criterion should read like a test assertion — something you can point at the code and say "yes" or "no."

**BAD:** Build chat interface
**GOOD:** User sends a message, receives a response, both are visible in the conversation thread

**BAD:** Add authentication
**GOOD:** Unauthenticated request to /api/* returns 401. Authenticated request returns expected data.

**BAD:** Improve performance
**GOOD:** Page load time under 2 seconds on 3G connection (measured by Lighthouse)

## The Pattern

1. **Who** does something (or what triggers)
2. **What** happens as a result
3. **How** you can observe it happened

If a criterion is missing any of these three, it's probably too vague.

## When Subjective Criteria Are OK

Some tasks genuinely have subjective outcomes — design quality, documentation clarity, code readability. In these cases, state what "good enough" looks like with examples rather than pretending objectivity.
