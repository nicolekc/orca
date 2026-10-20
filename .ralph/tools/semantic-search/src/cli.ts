import { existsSync, readFileSync, readdirSync, statSync, chmodSync } from 'node:fs';
import path from 'node:path';
import {
  ChunkRecord, SearchIndex, MODEL, DIMS,
  chunkHash, indexPath, loadIndex, saveIndex,
  decodeVectors, encodeVectors, embed, splitText,
} from './lib.js';

function die(msg: string): never {
  console.error(`error: ${msg}`);
  process.exit(1);
}

function readInput(file: string | undefined): string {
  return readFileSync(file ?? 0, 'utf8');
}

interface Parsed {
  positional: string[];
  flags: Record<string, string | boolean>;
  meta: Record<string, string>; // accumulated --meta k=v / --where k=v
}

function parseArgs(argv: string[], metaFlag: string): Parsed {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  const meta: Record<string, string> = {};
  const valueFlags = new Set([
    'size', 'overlap', 'source-file', 'date', 'k', 'since', 'until', 'query-file', metaFlag,
  ]);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const name = a.slice(2);
      if (valueFlags.has(name)) {
        const v = argv[++i];
        if (v === undefined) die(`--${name} needs a value`);
        if (name === metaFlag) {
          const eq = v.indexOf('=');
          if (eq < 1) die(`--${metaFlag} expects key=value, got "${v}"`);
          meta[v.slice(0, eq)] = v.slice(eq + 1);
        } else {
          flags[name] = v;
        }
      } else {
        flags[name] = true;
      }
    } else if (a === '-k') {
      const v = argv[++i];
      if (v === undefined) die('-k needs a value');
      flags['k'] = v;
    } else {
      positional.push(a);
    }
  }
  return { positional, flags, meta };
}

// --- chunk: mechanical splitter -> chunk records on stdout ---

function cmdChunk(argv: string[]): void {
  const { positional, flags, meta } = parseArgs(argv, 'meta');
  const text = readInput(positional[0]);
  const sourceFile = (flags['source-file'] as string) ?? positional[0];
  if (!sourceFile) die('--source-file is required when reading from stdin');
  const size = flags['size'] ? parseInt(flags['size'] as string, 10) : 1200;
  const overlap = flags['overlap'] ? parseInt(flags['overlap'] as string, 10) : 200;
  for (const piece of splitText(text, size, overlap)) {
    const rec: ChunkRecord = { text: piece, source_file: sourceFile };
    if (flags['date']) rec.date = flags['date'] as string;
    if (Object.keys(meta).length) rec.meta = meta;
    console.log(JSON.stringify(rec));
  }
}

// --- ingest: chunk records (JSONL) -> category index ---

function parseRecords(raw: string): ChunkRecord[] {
  const records: ChunkRecord[] = [];
  const lines = raw.split('\n');
  for (let n = 0; n < lines.length; n++) {
    const line = lines[n].trim();
    if (!line) continue;
    let rec: any;
    try {
      rec = JSON.parse(line);
    } catch (e: any) {
      die(`line ${n + 1}: invalid JSON (${e.message})`);
    }
    if (typeof rec.text !== 'string' || !rec.text.trim()) die(`line ${n + 1}: "text" must be a non-empty string`);
    if (typeof rec.source_file !== 'string' || !rec.source_file) die(`line ${n + 1}: "source_file" must be a string`);
    if (rec.date != null && !/^\d{4}-\d{2}-\d{2}/.test(rec.date)) {
      die(`line ${n + 1}: "date" must be ISO (YYYY-MM-DD...) or null, got "${rec.date}"`);
    }
    if (rec.meta != null && (typeof rec.meta !== 'object' || Array.isArray(rec.meta))) {
      die(`line ${n + 1}: "meta" must be an object of strings`);
    }
    records.push({
      text: rec.text,
      source_file: rec.source_file,
      ...(rec.date != null ? { date: rec.date } : {}),
      ...(rec.meta ? { meta: Object.fromEntries(Object.entries(rec.meta).map(([k, v]) => [k, String(v)])) } : {}),
    });
  }
  return records;
}

async function insertRecords(categoryDir: string, records: ChunkRecord[]): Promise<{ fresh: number; dupes: number; total: number }> {
  const index: SearchIndex = loadIndex(categoryDir) ?? { model: MODEL, dims: DIMS, chunks: [], vectors: '' };
  if (index.model !== MODEL) die(`index at ${indexPath(categoryDir)} was built with model ${index.model}; this tool embeds with ${MODEL}`);

  const seen = new Set(index.chunks.map((c) => c.hash));
  const fresh: ChunkRecord[] = [];
  let dupes = 0;
  for (const rec of records) {
    const h = chunkHash(rec);
    if (seen.has(h)) { dupes++; continue; }
    seen.add(h);
    fresh.push({ ...rec, hash: h });
  }

  if (fresh.length) {
    console.error(`embedding ${fresh.length} chunks...`);
    const newVecs = await embed(fresh.map((r) => r.text));
    const oldVecs = index.chunks.length ? decodeVectors(index) : new Float32Array(0);
    const all = new Float32Array(oldVecs.length + newVecs.length);
    all.set(oldVecs);
    all.set(newVecs, oldVecs.length);
    index.chunks.push(...fresh);
    index.vectors = encodeVectors(all);
    saveIndex(categoryDir, index);
  }
  return { fresh: fresh.length, dupes, total: index.chunks.length };
}

async function cmdIngest(argv: string[]): Promise<void> {
  const { positional } = parseArgs(argv, 'meta');
  const categoryDir = positional[0];
  if (!categoryDir) die('usage: semsearch ingest <category-dir> [chunks.jsonl]  (default: stdin)');
  if (!existsSync(categoryDir) || !statSync(categoryDir).isDirectory()) die(`not a directory: ${categoryDir}`);

  const records = parseRecords(readInput(positional[1]));
  const r = await insertRecords(categoryDir, records);
  console.log(`ingested ${r.fresh} new chunks (${r.dupes} duplicates skipped) — index now ${r.total} chunks at ${indexPath(categoryDir)}`);
}

// Make the index equal to `records`: reuse the stored vector for every chunk whose
// hash is still present, embed only the new ones, drop the rest. The result is a
// mirror of the directory that was swept, so edits and deletions don't leave
// stale chunks behind.
async function reconcileRecords(categoryDir: string, records: ChunkRecord[]): Promise<{ fresh: number; kept: number; dropped: number; total: number }> {
  const index: SearchIndex = loadIndex(categoryDir) ?? { model: MODEL, dims: DIMS, chunks: [], vectors: '' };
  if (index.model !== MODEL) die(`index at ${indexPath(categoryDir)} was built with model ${index.model}; this tool embeds with ${MODEL}`);

  const want = new Map<string, ChunkRecord>();
  for (const rec of records) {
    const h = chunkHash(rec);
    if (!want.has(h)) want.set(h, { ...rec, hash: h });
  }

  const oldVecs = index.chunks.length ? decodeVectors(index) : new Float32Array(0);
  const kept: ChunkRecord[] = [];
  const keptVecs: Float32Array[] = [];
  const have = new Set<string>();
  index.chunks.forEach((c, i) => {
    if (!c.hash || !want.has(c.hash) || have.has(c.hash)) return;
    have.add(c.hash);
    kept.push(want.get(c.hash)!);
    keptVecs.push(oldVecs.subarray(i * index.dims, (i + 1) * index.dims));
  });
  const fresh = [...want.values()].filter((r) => !have.has(r.hash!));
  const dropped = index.chunks.length - kept.length;

  if (fresh.length || dropped) {
    if (fresh.length) console.error(`embedding ${fresh.length} chunks...`);
    const newVecs = fresh.length ? await embed(fresh.map((r) => r.text)) : new Float32Array(0);
    const all = new Float32Array((kept.length + fresh.length) * DIMS);
    keptVecs.forEach((v, i) => all.set(v, i * DIMS));
    all.set(newVecs, kept.length * DIMS);
    index.chunks = [...kept, ...fresh];
    index.vectors = encodeVectors(all);
    saveIndex(categoryDir, index);
  }
  return { fresh: fresh.length, kept: kept.length, dropped, total: index.chunks.length };
}

// --- sweep: re-chunk every plain-text file in a directory; the index becomes a mirror of the directory ---

async function cmdSweep(argv: string[]): Promise<void> {
  const { positional, flags } = parseArgs(argv, 'meta');
  const dir = positional[0];
  if (!dir) die('usage: semsearch sweep <dir>');
  if (!existsSync(dir) || !statSync(dir).isDirectory()) die(`not a directory: ${dir}`);
  const size = flags['size'] ? parseInt(flags['size'] as string, 10) : 1200;
  const overlap = flags['overlap'] ? parseInt(flags['overlap'] as string, 10) : 200;

  const records: ChunkRecord[] = [];
  const walk = (d: string) => {
    for (const entry of readdirSync(d)) {
      if (entry.startsWith('.')) continue;
      const p = path.join(d, entry);
      const st = statSync(p);
      if (st.isDirectory()) { walk(p); continue; }
      if (!/\.(md|txt)$/i.test(entry)) continue;
      const date = st.mtime.toISOString().slice(0, 10);
      const rel = path.relative(dir, p);
      for (const piece of splitText(readFileSync(p, 'utf8'), size, overlap)) {
        records.push({ text: piece, source_file: rel, date });
      }
    }
  };
  walk(dir);

  const r = await reconcileRecords(dir, records);
  console.log(`[${new Date().toISOString()}] swept ${dir}: ${r.fresh} new, ${r.kept} kept, ${r.dropped} dropped — index now ${r.total} chunks`);
}

// --- query: embed query text, cosine against one or more category indexes ---

interface Store { category: string; index: SearchIndex; vectors: Float32Array }

function loadStores(dirs: string[]): Store[] {
  const stores: Store[] = [];
  for (const dir of dirs) {
    if (!existsSync(dir)) die(`no such directory: ${dir}`);
    if (existsSync(indexPath(dir))) {
      const index = loadIndex(dir)!;
      stores.push({ category: path.basename(path.resolve(dir)), index, vectors: decodeVectors(index) });
      continue;
    }
    // no index here — treat as a parent (e.g. the project dir) and pick up every category under it
    let found = 0;
    for (const entry of readdirSync(dir)) {
      const sub = path.join(dir, entry);
      if (statSync(sub).isDirectory() && existsSync(indexPath(sub))) {
        const index = loadIndex(sub)!;
        stores.push({ category: entry, index, vectors: decodeVectors(index) });
        found++;
      }
    }
    if (!found) die(`no search index in ${dir} (or its immediate subdirectories) — has this category been ingested?`);
  }
  return stores;
}

async function cmdQuery(argv: string[]): Promise<void> {
  const { positional, flags, meta: where } = parseArgs(argv, 'where');
  let queryText: string;
  let dirs: string[];
  if (flags['query-file']) {
    queryText = readInput(flags['query-file'] === '-' ? undefined : (flags['query-file'] as string));
    dirs = positional;
  } else {
    queryText = positional[0];
    dirs = positional.slice(1);
  }
  if (!queryText?.trim()) die('no query text (pass it as the first argument, or via --query-file)');
  if (!dirs.length) die('usage: semsearch query "<text>" <dir> [dir...]  or  semsearch query --query-file f.txt <dir> [dir...]');

  const k = flags['k'] ? parseInt(flags['k'] as string, 10) : 8;
  const since = flags['since'] as string | undefined;
  const until = flags['until'] as string | undefined;
  const stores = loadStores(dirs);

  const qvec = await embed([queryText]);
  type Hit = { score: number; chunk: ChunkRecord; category: string };
  const hits: Hit[] = [];
  for (const store of stores) {
    const { chunks } = store.index;
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      if (since || until) {
        const d = c.date?.slice(0, 10);
        if (!d) continue;
        if (since && d < since) continue;
        if (until && d > until) continue;
      }
      let skip = false;
      for (const [key, val] of Object.entries(where)) {
        const actual = key === 'source' ? c.source_file : c.meta?.[key];
        if (key === 'source' ? !actual?.includes(val) : actual !== val) { skip = true; break; }
      }
      if (skip) continue;
      let score = 0;
      const off = i * store.index.dims;
      for (let j = 0; j < store.index.dims; j++) score += qvec[j] * store.vectors[off + j];
      hits.push({ score, chunk: c, category: store.category });
    }
  }
  hits.sort((a, b) => b.score - a.score);
  const top = hits.slice(0, k);

  if (flags['json']) {
    for (const h of top) {
      console.log(JSON.stringify({ score: +h.score.toFixed(4), category: h.category, ...h.chunk, hash: undefined }));
    }
    return;
  }
  if (!top.length) {
    console.log('no results');
    return;
  }
  for (const h of top) {
    const metaStr = h.chunk.meta ? '  ' + Object.entries(h.chunk.meta).map(([k2, v]) => `${k2}=${v}`).join(' ') : '';
    console.log(`${h.score.toFixed(3)}  ${h.chunk.date?.slice(0, 10) ?? '   undated'}  [${h.category}]  ${h.chunk.source_file}${metaStr}`);
    if (flags['full']) {
      console.log(h.chunk.text.split('\n').map((l) => '    ' + l).join('\n') + '\n');
    } else {
      const snippet = h.chunk.text.replace(/\s+/g, ' ').trim().slice(0, 320);
      console.log(`    ${snippet}\n`);
    }
  }
}

// --- status ---

function cmdStatus(argv: string[]): void {
  const { positional } = parseArgs(argv, 'meta');
  if (!positional.length) die('usage: semsearch status <dir> [dir...]');
  for (const store of loadStores(positional)) {
    const dates = store.index.chunks.map((c) => c.date?.slice(0, 10)).filter(Boolean).sort();
    const range = dates.length ? `${dates[0]} → ${dates[dates.length - 1]}` : 'no dates';
    console.log(`${store.category}: ${store.index.chunks.length} chunks, ${range}`);
  }
}

// --- main ---

const [cmd, ...rest] = process.argv.slice(2);
const USAGE = `semsearch — local semantic search over chunk records

usage:
  semsearch chunk [file] [--source-file f] [--date YYYY-MM-DD] [--meta k=v ...] [--size 1200] [--overlap 200]
  semsearch ingest <category-dir> [chunks.jsonl]        (default: stdin)
  semsearch sweep <dir> [--size 1200] [--overlap 200]   re-chunk every .md/.txt in <dir>; index mirrors the dir (edits/deletes included)
  semsearch query "<text>" <dir> [dir...] [-k 8] [--full] [--json] [--since D] [--until D] [--where k=v ...]
  semsearch query --query-file f.txt <dir> [dir...]     (use - for stdin)
  semsearch status <dir> [dir...]

See README.md for the chunk-record contract and how to query well.`;

switch (cmd) {
  case 'chunk': cmdChunk(rest); break;
  case 'ingest': await cmdIngest(rest); break;
  case 'sweep': await cmdSweep(rest); break;
  case 'query': await cmdQuery(rest); break;
  case 'status': cmdStatus(rest); break;
  default:
    console.log(USAGE);
    process.exit(cmd ? 1 : 0);
}
