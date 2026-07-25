// supabase/functions/glowe-translate/index.ts — FR-TRANSLATE-005 / 006.
//
// Demand-driven translation of GLOWE content fields. Accepts either a single
// item (legacy) or a batch { targetLanguage, items:[...] }. Anon is allowed
// (GLOWE serves anonymous readers). Anti-poisoning: the text is READ FROM THE
// SOURCE ROW with the service-role client, never from the request body. The
// batch path reads all source rows grouped by table (one query per table) and
// fans the misses out to the provider with bounded concurrency (translateMany),
// so N misses cost ONE client→Edge round-trip. All GLOWE source tables are
// anon-public, so no per-user visibility check is required.
//
// POST { contentType, contentId, field, targetLanguage }                  (legacy)
//   → 200 { status:'translated'|'cached'|'skipped', translation? }
// POST { targetLanguage, items:[{ contentType, contentId, field }] }      (batch)
//   → 200 { results:[{ contentType, contentId, field, status, translation? }] }
//   → 400 { error:'invalid_body'|'unsupported_language' }  405 method_not_allowed
//   → 500 { error:'internal' }

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders, isAllowedOrigin } from '../_shared/cors.ts';
import { isTranslatable, needsTranslation } from '../_shared/translation/shortcircuit.ts';
import { selectProvider } from '../_shared/translation/provider.ts';
import { isSupportedTarget } from '../_shared/translation/supportedLanguages.ts';
import { translateMany } from '../_shared/translation/batch.ts';
import { resolveField, SOURCE } from '../_shared/translation/gloweSource.ts';
import { getCached, putIfAbsent, type CacheRow } from './cache.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const MAX_INPUT = 5000;
const PROVIDER_CONCURRENCY = 8;

interface Item {
  contentType: string;
  contentId: string;
  field: string;
}
type Status = 'translated' | 'cached' | 'skipped';
interface Result {
  contentType: string;
  contentId: string;
  field: string;
  status: Status;
  translation?: CacheRow;
}

function json(body: unknown, status: number, h: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...h },
  });
}

function isItem(v: unknown): v is Item {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.contentType === 'string' && typeof o.contentId === 'string'
    && typeof o.field === 'string' && !!o.contentType && !!o.contentId && !!o.field;
}

// Legacy single body OR batch body → a normalized { targetLanguage, items }.
function toItems(raw: unknown): { targetLanguage: string; items: Item[] } | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.targetLanguage !== 'string' || !o.targetLanguage) return null;
  if (Array.isArray(o.items)) {
    return { targetLanguage: o.targetLanguage, items: o.items.filter(isItem) };
  }
  if (isItem(o)) {
    return {
      targetLanguage: o.targetLanguage,
      items: [{ contentType: o.contentType, contentId: o.contentId, field: o.field }],
    };
  }
  return null;
}

// True iff the item's (contentType, field) is in the allow-list.
function isAllowed(it: Item): boolean {
  const src = SOURCE[it.contentType];
  return !!src && !!resolveField(src, it.field);
}

// Batched source reads: one query per source table. Returns a map keyed
// `${table}:${id}` → the row (with every requested column for that table).
async function readSources(
  svc: SupabaseClient,
  items: Item[],
): Promise<Record<string, Record<string, unknown>>> {
  const byTable: Record<string, { pk: string; ids: Set<string>; cols: Set<string> }> = {};
  for (const it of items) {
    const src = SOURCE[it.contentType];
    const r = resolveField(src, it.field);
    if (!r) continue;
    const g = byTable[src.table] ?? (byTable[src.table] = { pk: src.pk, ids: new Set(), cols: new Set() });
    g.ids.add(it.contentId);
    g.cols.add(r.column);
  }
  const out: Record<string, Record<string, unknown>> = {};
  for (const [table, g] of Object.entries(byTable)) {
    const select = [g.pk, ...g.cols].join(', ');
    const { data, error } = await svc.from(table).select(select).in(g.pk, Array.from(g.ids));
    if (error) {
      console.warn('[glowe-translate] source read failed', { table, detail: error.message });
      continue;
    }
    if (!data) continue;
    for (const row of data as unknown as Record<string, unknown>[]) {
      out[`${table}:${row[g.pk]}`] = row;
    }
  }
  return out;
}

// Source text for an item from its already-read row, or null when it is
// missing / not a translatable string / too long. Reads the exact array
// element for a "col.N" field.
function sourceTextFor(it: Item, rows: Record<string, Record<string, unknown>>): string | null {
  const src = SOURCE[it.contentType];
  const r = resolveField(src, it.field);
  if (!r) return null;
  const row = rows[`${src.table}:${it.contentId}`];
  if (!row) return null;
  const raw = row[r.column];
  const val = r.index === null ? raw : (Array.isArray(raw) ? raw[r.index] : undefined);
  if (typeof val !== 'string') return null;
  const t = val.trim();
  if (!t || t.length > MAX_INPUT || !isTranslatable(t)) return null;
  return val;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function skipped(it: Item): Result {
  return { contentType: it.contentType, contentId: it.contentId, field: it.field, status: 'skipped' };
}

function hit(it: Item, status: Status, translation: CacheRow): Result {
  return { contentType: it.contentType, contentId: it.contentId, field: it.field, status, translation };
}

// Resolve every item to a Result, in input order. Cache hits and short-circuits
// resolve inline; genuine misses fan out to the provider with bounded
// concurrency, then upsert single-flight. Per-item cache-table errors degrade
// that one item without aborting the batch.
async function resolveBatch(svc: SupabaseClient, target: string, items: Item[]): Promise<Result[]> {
  const rows = await readSources(svc, items.filter(isAllowed));
  const results = new Array<Result>(items.length);
  const misses: { i: number; it: Item; text: string }[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const text = isAllowed(it) ? sourceTextFor(it, rows) : null;
    if (text === null) { results[i] = skipped(it); continue; }
    const key = { contentType: it.contentType, contentId: it.contentId, field: it.field, targetLanguage: target };
    // A cache-read failure degrades to a miss (still try to translate), never
    // aborts the whole batch.
    let cached: CacheRow | null = null;
    try {
      cached = await getCached(svc, key);
    } catch (e) {
      console.warn('[glowe-translate] cache read failed', { field: it.field, detail: errMsg(e) });
    }
    if (cached) { results[i] = hit(it, 'cached', cached); continue; }
    misses.push({ i, it, text });
  }

  const translated = await translateMany(
    selectProvider(),
    misses.map((m) => ({ text: m.text, targetLanguage: target })),
    PROVIDER_CONCURRENCY,
  );
  const failed = translated.filter((r) => r === null).length;
  if (failed > 0) {
    console.warn('[glowe-translate] provider misses returned null', { failed, total: misses.length });
  }

  for (let k = 0; k < misses.length; k++) {
    const { i, it } = misses[k];
    const res = translated[k];
    if (!res || !needsTranslation(res.detectedSourceLanguage, target)) { results[i] = skipped(it); continue; }
    const key = { contentType: it.contentType, contentId: it.contentId, field: it.field, targetLanguage: target };
    const row: CacheRow = {
      ...key,
      sourceLanguage: res.detectedSourceLanguage,
      translatedText: res.translatedText,
      model: res.model,
      confidence: res.confidence,
    };
    // A cache-write failure still serves this item's fresh translation.
    try {
      const inserted = await putIfAbsent(svc, row);
      results[i] = hit(it, inserted ? 'translated' : 'cached', inserted ? row : (await getCached(svc, key)) ?? row);
    } catch (e) {
      console.warn('[glowe-translate] cache write failed', { field: it.field, detail: errMsg(e) });
      results[i] = hit(it, 'translated', row);
    }
  }
  return results;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') {
    return isAllowedOrigin(origin)
      ? new Response('ok', { status: 200, headers: corsHeaders(origin) })
      : json({ error: 'origin_not_allowed' }, 403);
  }
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const hdrs = isAllowedOrigin(origin) ? corsHeaders(origin) : {};

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: 'invalid_body' }, 400, hdrs);
  }
  const parsed = toItems(raw);
  if (!parsed || parsed.items.length === 0) return json({ error: 'invalid_body' }, 400, hdrs);
  if (!isSupportedTarget(parsed.targetLanguage)) return json({ error: 'unsupported_language' }, 400, hdrs);

  const svc = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  let results: Result[];
  try {
    results = await resolveBatch(svc, parsed.targetLanguage, parsed.items);
  } catch (e) {
    console.warn('[glowe-translate] batch failed', { detail: e instanceof Error ? e.message : String(e) });
    return json({ error: 'internal' }, 500, hdrs);
  }

  // Legacy single-item body keeps its original response shape.
  if (!Array.isArray((raw as Record<string, unknown>).items)) {
    const r = results[0];
    return json(
      r && r.status !== 'skipped' ? { status: r.status, translation: r.translation } : { status: 'skipped' },
      200,
      hdrs,
    );
  }
  return json({ results }, 200, hdrs);
});
