import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const TOOL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const MODEL = 'Xenova/all-MiniLM-L6-v2';
export const DIMS = 384;

export interface ChunkRecord {
  text: string;
  source_file: string;
  date?: string | null;
  meta?: Record<string, string>;
  hash?: string;
}

export interface SearchIndex {
  model: string;
  dims: number;
  chunks: ChunkRecord[];
  vectors: string; // base64-encoded Float32Array, length = chunks.length * dims
}

export function chunkHash(rec: ChunkRecord): string {
  return createHash('sha256').update(rec.source_file + '\0' + rec.text).digest('hex');
}

export function indexPath(categoryDir: string): string {
  return path.join(categoryDir, '.search', 'index.json');
}

export function loadIndex(categoryDir: string): SearchIndex | null {
  const p = indexPath(categoryDir);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf8')) as SearchIndex;
}

export function saveIndex(categoryDir: string, index: SearchIndex): void {
  const dir = path.join(categoryDir, '.search');
  mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.index.json.tmp`);
  writeFileSync(tmp, JSON.stringify(index));
  renameSync(tmp, path.join(dir, 'index.json'));
}

export function decodeVectors(index: SearchIndex): Float32Array {
  const buf = Buffer.from(index.vectors, 'base64');
  // copy to guarantee 4-byte alignment
  const out = new Float32Array(buf.byteLength / 4);
  out.set(new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)));
  return out;
}

export function encodeVectors(vecs: Float32Array): string {
  return Buffer.from(vecs.buffer, vecs.byteOffset, vecs.byteLength).toString('base64');
}

let extractorPromise: Promise<any> | null = null;

export async function embed(texts: string[]): Promise<Float32Array> {
  const { pipeline, env } = await import('@huggingface/transformers');
  (env as any).cacheDir = path.join(TOOL_ROOT, 'models');
  extractorPromise ??= pipeline('feature-extraction', MODEL, { dtype: 'q8' } as any);
  const fe = await extractorPromise;
  const out = new Float32Array(texts.length * DIMS);
  const BATCH = 32;
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    const res = await fe(batch, { pooling: 'mean', normalize: true });
    const data = res.data as Float32Array;
    if (data.length !== batch.length * DIMS) {
      throw new Error(`unexpected embedding shape: got ${data.length}, expected ${batch.length * DIMS}`);
    }
    out.set(data, i * DIMS);
  }
  return out;
}

/**
 * Mechanical splitter: packs paragraphs into pieces of ~`size` chars;
 * a single paragraph longer than `size` is hard-split with `overlap` chars of overlap.
 * Semantic segmentation (by turn, by section, by heading) is the caller's job.
 */
export function splitText(text: string, size = 1200, overlap = 200): string[] {
  const pieces: string[] = [];
  let cur = '';
  const flush = () => {
    if (cur) pieces.push(cur);
    cur = '';
  };
  for (let p of text.split(/\n\s*\n/)) {
    p = p.trim();
    if (!p) continue;
    if (p.length > size) {
      flush();
      for (let start = 0; start < p.length; start += size - overlap) {
        pieces.push(p.slice(start, start + size));
        if (start + size >= p.length) break;
      }
      continue;
    }
    if (cur && cur.length + p.length + 2 > size) flush();
    cur = cur ? cur + '\n\n' + p : p;
  }
  flush();
  return pieces;
}
