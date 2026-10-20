---
name: new-resource
description: Add a searchable resource category to a project — solicit context from the human, set up the category, build its ingester, ingest the files
---

You are adding a resource category to a project's context directory, with the human present. This is interactive — the human has knowledge about these files that you can't infer, so solicit it before building anything.

$ARGUMENTS names the project (and optionally the category); ask if unclear.

## What you're building

A finished category is a directory a build agent can use without you:

```
<project>/<category>/
├── AGENTS.md            # what this holds, how to use it, meta keys, how to re-ingest
├── sources/             # the human's raw files, never modified — plus any rendered
│                        #   copies the ingester produces alongside them
├── .search/index.json   # the vector db (committed)
└── <ingester>           # whatever turns sources/ into the db — script, prompts, notes
```

The ingester is the real work: a repeatable process that turns this category's raw format into chunk records and inserts them with the semantic-search tool. It lives in the category directory so that when the human adds more files later, re-running it is cheap (dedup makes re-runs safe). The tool itself — the chunk-record contract, commands, and adapter design guidance — is documented in `.ralph/tools/semantic-search/README.md`; read it in full before designing, and don't duplicate it here or in AGENTS.md.

## What you need from the human

- What are these files? (format, where they came from, roughly how many)
- What's in them, and how does the human think about them? Their framing is the heart of AGENTS.md.
- Where are they dumping the files?
- How do dates work in this content? Dates drive recency in search — when the source doesn't state them, ask the human rather than guess.

Then create the category directory, bring the files into `sources/`, and examine several real ones before deciding how the ingester should work.

## Ingest and verify

Run the ingestion. Then verify like a user: run a few real queries a build agent might ask, and show the human the results — scores, dates, meta. Bad chunking shows up here; fix it before calling the category done. Each chunking fix means resetting the db — delete `.search/index.json` and re-ingest — since dedup is append-only and would keep the bad chunks alongside the fixed ones.

## Document

- Write the category's `AGENTS.md`. Its job: relay the human's framing of this material, and turn it into search behavior — "use the query tool to look for this kind of thing here", with the meta keys worth filtering on and example queries the framing suggests. Name the raw format, for when a search points the reader into the source files. Include how to re-run ingestion and any format quirks worth knowing.
- Add the category to `RESOURCE-INDEX.md`.
- Commit everything, including the search db.
