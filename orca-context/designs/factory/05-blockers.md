# 5. Blockers and steering

**Summary.** A blocker is a question file with options; the group goes to `blocked` and the worker
waits for free. The Mac, not the container, sends the phone push. You answer wherever is handy, and
the answer is a file the waiting worker picks up. Steering uses the same path.

## Raising a blocker

**Summary.** `factory ask` writes the question and marks the group blocked; the lease stays alive
while it waits, and a long wait can park the group so the worker takes other work.

- A genuine blocker: a product decision, a missing credential, an irreversible action, or acceptance
  criteria that contradict each other. Anything else becomes an assumption recorded with the evidence,
  for review to correct. That's trust-and-correct, not a rule table.
- Waiting costs nothing: Monitor watches for the answer.

## Pinging you

**Summary.** `orca serve` on the Mac watches `.factory/` and sends the push (ntfy to start, or
Pushover or Telegram), so no push credential lives in a container. Without orca, `factory notify`
runs wherever you like.

- The message is built by the Mac from the question's fields, shown as plain text, cut to length,
  with a fixed label, so a container can't send a convincing "tap to approve" link of its own.
- Action buttons point at the dashboard, never at a container.
- Claude workers can also use their own phone notifications (Remote Control); Codex's mobile route
  needs the ChatGPT desktop app as host, so the factory's push covers it.

## Answering and steering

**Summary.** Four ways in, all ending as a file the worker's wait script turns into an event.

1. **Dashboard:** answer the question, or send a steer note to a group.
2. **Main chat:** tell the planner; it runs `factory answer` or `factory steer`.
3. **The worker directly:** attach its terminal (`orca start --terminal <worker>`), or open it in
   Remote Control (Claude) and type.
4. **Tool approvals** aren't questions: keep them rare with auto mode or an allowlist; Remote Control
   or a channel's permission relay can approve from the phone.

A steer note reaches a running worker mid-turn (Monitor events interrupt), and the dispatcher passes
it to the subagent. Steer notes are recorded, so review sees what was asked.

## Security

**Summary.** Containers are untrusted: they write only their own `.factory/` folder, the Mac only
reads it as data, and claims there are claims, not proof.

- Answers and steers go in through the dashboard's existing token and cross-site checks.
- Nothing from `.factory/` is ever run on the Mac.
- Getting the dashboard onto the phone is open: it listens on the Mac's loopback today (see
  [decisions](10-decisions.md)).
