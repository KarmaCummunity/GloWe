import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseBlockRepository } from '../SupabaseBlockRepository';

/* eslint-disable @typescript-eslint/no-explicit-any */

function fakeClient(result: { data?: unknown; error?: { code?: string; message: string } | null }) {
  const log: string[] = [];
  const chain: any = {
    select: () => chain,
    delete: () => { log.push('delete'); return chain; },
    eq: (c: string, v: string) => { log.push(`${c}=${v}`); return chain; },
    maybeSingle: async () => ({ data: result.data ?? null, error: result.error ?? null }),
    then: (res: (v: unknown) => unknown) => res({ error: result.error ?? null }),
  };
  const client = {
    from: (table: string) => {
      log.push(`from:${table}`);
      return {
        ...chain,
        insert: async (row: any) => { log.push(`insert:${row.blocker_id}>${row.blocked_id}`); return { error: result.error ?? null }; },
      };
    },
  } as unknown as SupabaseClient<any>;
  return { client, log };
}

describe('SupabaseBlockRepository', () => {
  it('isBlocking reflects whether a row exists', async () => {
    expect(await new SupabaseBlockRepository(fakeClient({ data: { blocked_id: 'b' } }).client).isBlocking('a', 'b')).toBe(true);
    expect(await new SupabaseBlockRepository(fakeClient({ data: null }).client).isBlocking('a', 'b')).toBe(false);
  });
  it('block inserts and treats duplicate as success', async () => {
    const ok = fakeClient({});
    await new SupabaseBlockRepository(ok.client).block('a', 'b');
    expect(ok.log).toContain('insert:a>b');
    await expect(new SupabaseBlockRepository(fakeClient({ error: { code: '23505', message: 'dup' } }).client).block('a', 'b')).resolves.toBeUndefined();
    await expect(new SupabaseBlockRepository(fakeClient({ error: { code: '42501', message: 'rls' } }).client).block('a', 'b')).rejects.toThrow('rls');
  });
  it('unblock deletes the blocker row', async () => {
    const f = fakeClient({});
    await new SupabaseBlockRepository(f.client).unblock('a', 'b');
    expect(f.log).toEqual(['from:blocks', 'delete', 'blocker_id=a', 'blocked_id=b']);
  });
});
