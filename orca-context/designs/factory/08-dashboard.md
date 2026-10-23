# 8. The dashboard

**Summary.** A new screen in `orca serve` (same token, same look), reading `.factory/` and `gh`. It
shows how work moves and points at where the work is. You steer, approve and pick there; you don't
define or discuss tasks there, which stays in the main chat.

## What it shows

**Summary.** "Needs you" first, then the flow, then who's working and what it costs.

- **Needs you:** blocked questions, work ready for review, variations to pick, oldest first. On a
  phone this is most of the screen.
- **Lanes:** queued → grouped → working → blocked → review → revising → merging → done. Each card:
  title, group, worker (Claude or Codex, which terminal), time in lane, latest status line.
- **Review inbox:** evidence thumbnails, the live link (or "start environment"), PR, CI, diff size,
  round. Opening one shows the gallery: before/after, the video with chapters, rounds compared.
- **Workers and capacity:** who's on what, idle or busy, RAM per host, running environments.
- **Links out:** PR, CI run, preview, branch, the worker's terminal, its Remote Control session.

## Steering allowed there

Reorder the queue, pause or resume a worker, stop an environment, reassign, answer a question, send
a steer note, approve, send back with notes, pick a variation. Creating a task links back to the
main chat instead.

## On the phone

Live links work only on the Mac (they're its loopback), so the phone shows screenshots and video with
"open on Mac". Reaching the dashboard from the phone at all is open (see [decisions](10-decisions.md)).

## Prior art

GitHub Agent HQ's "mission control" is the nearest (assign, steer and track agents across web and
mobile); Symphony uses Linear as its board; Vercel and Netlify comment on previews.
