// Read-cap guardrail on the GloWe backend adapter (FR-GLOWE-030).
//
// backend.js is a browser IIFE that binds to `window` and expects a Supabase
// client, so it is loaded here against a stub `window` plus a fake query
// builder that records the chain it receives. That is enough to assert the one
// thing that matters and cannot be checked by reading the file: every catalog
// read that has no pagination of its own ends in a `.limit(...)`.
//
// The point is regression protection. These queries were unbounded — fine at
// today's row counts, a cliff at scale — and nothing in the suite would notice
// if a future edit dropped the cap again.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BACKEND_SRC = readFileSync(resolve(HERE, '..', 'backend.js'), 'utf8');

/** Records every builder call so a test can assert the composed query. */
function makeQueryRecorder(rows) {
  const calls = [];
  const builder = {
    calls,
    select: (...a) => (calls.push(['select', ...a]), builder),
    eq: (...a) => (calls.push(['eq', ...a]), builder),
    order: (...a) => (calls.push(['order', ...a]), builder),
    limit: (...a) => (calls.push(['limit', ...a]), builder),
    // PostgREST builders are thenable; awaiting one runs the query.
    then: (resolveFn) => resolveFn({ data: rows, error: null }),
  };
  return builder;
}

/** Load backend.js into a fresh fake window wired to a stub Supabase client. */
function loadBackend({ rows = [], user = { id: 'u1' } } = {}) {
  const recorders = [];
  const supabaseClient = {
    auth: {
      getSession: async () => ({ data: { session: user ? { user } : null } }),
      getUser: async () => ({ data: { user }, error: null }),
    },
    from: (table) => {
      const rec = makeQueryRecorder(rows);
      rec.table = table;
      recorders.push(rec);
      return rec;
    },
  };

  const win = {
    GLOWE_BACKEND_CONFIG: { supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'k' },
    supabase: { createClient: () => supabaseClient },
    console,
    document: { querySelector: () => null, head: { appendChild() {} }, createElement: () => ({}) },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    addEventListener() {},
    location: { href: 'https://example.test/glowe/' },
  };
  win.window = win;
  win.self = win;

  // eslint-disable-next-line no-new-func
  new Function('window', 'self', 'document', 'localStorage', 'console', BACKEND_SRC)(
    win, win, win.document, win.localStorage, console,
  );
  return { backend: win.gloweBackend, recorders };
}

const limitOf = (rec) => rec.calls.find((c) => c[0] === 'limit')?.[1];

describe('catalog reads are bounded', () => {
  let loaded;
  beforeEach(() => { loaded = loadBackend(); });

  it('listAll caps rows and still orders', async () => {
    await loaded.backend.listAll('comments');
    const rec = loaded.recorders.at(-1);
    expect(rec.table).toBe('glowe_comments');
    expect(rec.calls.some((c) => c[0] === 'order')).toBe(true);
    // The exact ceiling is an implementation detail; that one exists is not.
    expect(limitOf(rec)).toBeGreaterThan(0);
  });

  it('listAll accepts a caller-supplied limit', async () => {
    await loaded.backend.listAll('posts', { limit: 5 });
    expect(limitOf(loaded.recorders.at(-1))).toBe(5);
  });

  it('listOwned caps rows', async () => {
    await loaded.backend.listOwned('projects');
    expect(limitOf(loaded.recorders.at(-1))).toBeGreaterThan(0);
  });

  it('listApprovedOrgs caps rows', async () => {
    await loaded.backend.listApprovedOrgs();
    expect(limitOf(loaded.recorders.at(-1))).toBeGreaterThan(0);
  });

  it('listMembers caps rows', async () => {
    await loaded.backend.listMembers();
    expect(limitOf(loaded.recorders.at(-1))).toBeGreaterThan(0);
  });
});

describe('truncation is reported, not silent', () => {
  it('warns when a read comes back full — dropped rows are a data bug', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // 500 rows is above any plausible cap, so the result is certainly truncated.
    const { backend } = loadBackend({ rows: Array.from({ length: 500 }, (_, i) => ({ id: i })) });
    await backend.listAll('posts');
    expect(warn).toHaveBeenCalled();
    expect(String(warn.mock.calls[0][0])).toMatch(/cap/i);
    warn.mockRestore();
  });

  it('stays quiet on a short read', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { backend } = loadBackend({ rows: [{ id: 1 }, { id: 2 }] });
    await backend.listAll('posts');
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
