# semantic-search

Local semantic search for project context. One tool serves every searchable store — resource categories and `scratch/` alike. It is completely format-blind: it never opens your raw files and knows nothing about chats, notes, or transcripts. Whoever ingests a resource decides how to turn raw files into chunk records; this tool embeds and searches them.

Everything runs locally: Xenova/all-MiniLM-L6-v2 (384 dims) via @huggingface/transformers, model cached under `models/` here after first use. No API keys, no network at query time.

## The pipeline

```
Raw files  →  [Adapter? LLM?]  →  Chunk records  →  insert  →  vector db  →  query
              (per-resource,      (JSONL, the        (this      (.search/     (this
               built at            contract below)    tool)      index.json)   tool)
               ingestion time)
```

"Ingestion" means the whole left half: getting from raw files to an updated vector db. This tool provides the mechanical pieces — a paragraph splitter, the insert step, and query. The semantic piece — deciding what a chunk IS for a given format (a chat turn, a dated note section, a doc heading) — is the adapter's job, written per-resource when the resource is first set up. Mixed or messy content may need LLM judgment instead of (or before) an adapter.

## Chunk-record contract

Insert takes JSONL — one record per line:

```json
{"text": "…the chunk content…", "date": "2026-05-14", "source_file": "sources/2026-05-14-router-chat.json", "meta": {"role": "human", "kind": "turn"}}
```

- `text` — required. What gets embedded and returned. Aim for ~500–1,500 chars of coherent content; use `semsearch chunk` to mechanically split anything longer.
- `source_file` — required. Path to the raw file this came from, relative to the category dir, so a reader can go look at the full context.
- `date` — optional ISO date (`YYYY-MM-DD`, time suffix allowed). Null/omitted when genuinely unknown. Dates drive recency filters, so infer them where the source supports it (file headers, `[MM/DD]` note headings + a known year, export metadata) — but don't fabricate.
- `meta` — optional flat object of strings. Whatever distinctions are worth filtering on for this resource: `role`, `kind`, `author`, `section`… The category's AGENTS.md should say which keys it uses.

Dedup is by hash of `source_file` + `text`: re-inserting the same records is a no-op, so re-running ingestion after **adding** files is always safe. `ingest` is append-only — it cannot detect changed or removed content. If a source file is edited or the ingester's chunking changes, the old chunks stay in the index as stale entries alongside the new ones; the fix is a rebuild: delete `.search/index.json` and re-ingest everything (cheap, unless ingestion involved LLM judgment). `sweep` is different: it makes the index a mirror of the directory on every run (see below), so sweep-managed directories never need a rebuild.

## Designing an adapter

Principles for whoever turns a new resource's raw files into chunk records:

- **Segment by the format's natural units first** (a turn, a dated section, a heading), then run the mechanical splitter only *within* a unit. Never let one chunk mix content from different dates or units.
- **A chunk must make sense read alone.** The test: retrieved cold, with nothing but its date and meta, does it carry its meaning? Some units are inherently responses — a reply, an answer, a comment on something above. Those lose their meaning without what they respond to, so prepend just enough of the preceding unit to restore it, clearly marked as context.
- **Cap prepended context hard.** Embeddings here are mean-pooled: a chunk's vector is the average of everything in it, so a short unit padded with a long context slice embeds as the context, and the unit's own words drown. A few hundred chars of context is the ceiling; the shorter the unit, the more this matters.
- **If the raw format is hostile to reading** (single-line JSON, machine exports), render a plain markdown copy into `sources/` at ingestion time and point `source_file` at the rendered copy, with position meta (`turn`, `section`, …). Readers who need surrounding context then just grep and read a normal file. The raw original stays untouched beside it. Rendering should prefer code — a deterministic transform in the adapter script, spending no tokens on content. If the format genuinely needs LLM judgment to render, discuss it with the human before committing to that cost. A render need not be one-to-one — a large source may become several smaller files, with `source_file` pointing at the specific part.
- **Don't resolve back-references at ingestion.** Content that says "that approach" or "the second idea" can't be rewritten to be self-contained without paying LLM cost on everything. The `source_file` pointer is the fix: a reader who hits an unresolved reference follows it and reads the neighborhood.
- **Record the distinctions worth filtering on** in `meta`, and document the keys in the category's AGENTS.md.

## Commands

Run `npm install` in this directory once; the model downloads on first use. Then run via the wrapper, `semsearch` in this directory, from anywhere:

```bash
# Mechanical splitter: text in, chunk records out (~1200 chars, paragraph-aware)
semsearch chunk notes.md --date 2026-08-01 --meta kind=note > chunks.jsonl
cat body.txt | semsearch chunk --source-file sources/big-doc.md > chunks.jsonl

# Insert chunk records into a category's index (creates <dir>/.search/index.json)
semsearch ingest myproject/notes chunks.jsonl
adapter.ts sources/chat.json | semsearch ingest myproject/chat-transcripts

# Query one or more stores (a category dir, or a parent dir to search all categories under it)
semsearch query "auth flow decisions" myproject/notes myproject/scratch
semsearch query "router design" myproject                  # all categories at once
semsearch query "why we dropped X" scratch/ -k 15 --full
semsearch query "eval harness" notes/ --since 2026-06-01 --where kind=note
semsearch query --query-file hypothetical.txt myproject   # or --query-file -

# Re-chunk every .md/.txt in a directory and insert — idempotent, for stores
# that are plain prose and grow over time (scratch)
semsearch sweep myproject/scratch

# What's in the indexes
semsearch status myproject
```

Query output: score, date (or `undated`), `[category]`, source file, meta tags, then a 320-char snippet (`--full` for whole chunks, `--json` for machine-readable JSONL). Default top-8.

`--since`/`--until` compare ISO dates and **exclude undated chunks**; `--where k=v` matches meta exactly (`--where source=foo` substring-matches the source file path).

## How to query well

- **Query with a hypothetical passage, not a description.** The index matches text-to-text, so a query that *reads like the chunk you hope exists* beats a query *about* it. Instead of `"discussions about database choice for the eval harness"`, write 2–5 sentences as if quoting the ideal result — e.g. "I think we should use SQLite for the eval results since it's zero-setup and the volume is tiny. Postgres is overkill for this." Put it in a file or stdin and use `--query-file`. Making up such passages is cheap for you and measurably improves retrieval.
- **Run 2–3 query variants** with different vocabulary; results that recur across variants are strong signals.
- **Prefer recency when ideas conflict** — `--since`, or just compare the dates in the output. Nothing here is gospel; later thinking may never have been written down at all.
- **Follow the source_file** when a snippet matters — the raw file has the surrounding context.

## Scratch is swept automatically

A PostToolUse hook (`scratch-hook.sh` here) fires on every Write/Edit to a project's `scratch/…` — a project being a directory that holds `RESOURCE-INDEX.md` — and on every Bash command that names such a path, and runs `sweep` on that scratch dir in the background — detached, serialized by a lock, logging to `scratch/.search/sweep.log`, never printing into the agent's context. So writing, editing or deleting a scratch file is enough for the index to follow a few seconds later. Sweep dates chunks by file mtime and needs no meta. Each sweep makes the index equal to the directory's current `.md`/`.txt` content — vectors are reused for unchanged chunks, only new chunks are embedded, and chunks of edited or deleted files are dropped — so running it by hand is always safe, and it must not be run on a directory whose index was built by `ingest` (it would replace the ingested chunks with plain mechanical ones).

Register it in the `.claude/settings.json` of the repo agents work from; with the framework installed at `.orca/`, that is the entry below. The hook needs `jq` and `flock` (on macOS, `brew install flock`).

```json
"hooks": {
  "PostToolUse": [
    { "matcher": "Write|Edit|Bash",
      "hooks": [{ "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.orca/tools/semantic-search/scratch-hook.sh" }] }
  ]
}
```

## Index format

`<category>/.search/index.json`: model name, dims, chunk records (with hashes), and all vectors as one base64-encoded Float32Array. Brute-force cosine (vectors are normalized, so dot product) — instant at this scale, no server. Committing the index to the project repo is recommended: where ingestion involved LLM judgment, the chunks themselves are work products you don't want to re-pay for.
