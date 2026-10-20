# Human Context for Task 001

The goal of making PRDs outcome-only is NOT about adding more specific verification criteria. It's the opposite.

PRDs should say WHAT to verify, not HOW. The agent's internalized verification rigor (seed.md) handles the HOW. When a PRD says "verify X works," the agent's job is to figure out the strongest possible way to verify X — and if the tools to do that are broken, fixing the tools IS part of verification.

The problem previously was agents accepting weak evidence that something works. An agent encountering a broken test framework or missing dependency should treat that as a verification failure and fix it — not route around it with mocks or "manual verification" notes.

So when rewriting PRDs: strip prescriptive HOW (implementation steps, file paths, methods), keep the WHAT and WHY. Verification criteria should describe observable outcomes, not test methodologies.
