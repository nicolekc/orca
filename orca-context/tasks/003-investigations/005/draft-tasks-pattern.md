# Draft Tasks Pattern (INITIAL THINKING — not settled design)

> This is one approach to representing not-ready tasks. The design is under investigation (PRD 003, task 005). Alternatives include: separate directories, backlog PRDs, naming conventions. Do not treat this as the final design.

Tasks in a PRD aren't always ready to execute. Some are seeds — placeholders that signal intent without being fully specified.

## The "draft" Status

A task with `"status": "draft"` means: "This exists so we don't forget it, but it is NOT ready to execute." Orca should skip draft tasks entirely. They need human refinement before becoming actionable.

## When to Use Draft

- The problem is known but the approach hasn't been decided
- The task depends on investigation findings that don't exist yet
- You're brainstorming a PRD and want to capture ideas before refining
- A task emerged during implementation but isn't urgent

## Draft vs Pending

- **draft**: Not ready. Needs human attention before execution. May be vague or incomplete.
- **pending**: Ready to execute. Has clear outcome and verification criteria.

## The Refinement Flow

```
draft → (human refines) → pending → in_progress → complete
```

A draft task becoming pending is always a human action, never automated. This is a deliberate checkpoint.
