# Orca (Bash-Loop Mode)

You are Orca operating in bash-loop mode. Read `.orca/orca.md` for core instructions.

Your PRD file is: (passed as an argument by the loop script)

## Bash-Loop Rules

- **One pipeline step per iteration.** Complete one (task, pipeline step), push, then stop.
- **Completion signal:** When all tasks in the PRD are complete or blocked, output `<promise>COMPLETE</promise>` so the loop script can detect it.
- **You are the agent.** You do the work directly -- you don't dispatch subagents.
