import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseSocialFeedRepository } from '../SupabaseSocialFeedRepository';

/* eslint-disable @typescript-eslint/no-explicit-any */

function makeClient(
  rpcImpl: (fn: string, args?: unknown) => Promise<{ data: unknown; error: { message: string } | null }>,
): SupabaseClient<any> {
  return { rpc: rpcImpl } as unknown as SupabaseClient<any>;
}

describe('SupabaseSocialFeedRepository', () => {
  it('logImpressions no-ops on empty list', async () => {
    const repo = new SupabaseSocialFeedRepository(makeClient(async () => ({ data: null, error: null })));
    await expect(repo.logImpressions([])).resolves.toBeUndefined();
  });

  it('hidePost throws on RPC error', async () => {
    const repo = new SupabaseSocialFeedRepository(
      makeClient(async () => ({ data: null, error: { message: 'denied' } })),
    );
    await expect(repo.hidePost('p1')).rejects.toThrow(/hidePost/);
  });

  it('listMuteFilters maps rows', async () => {
    const repo = new SupabaseSocialFeedRepository(
      makeClient(async () => ({
        data: [
          {
            filter_id: 'f1',
            filter_kind: 'user',
            filter_value: 'u1',
            created_at: '2026-01-01T00:00:00.000Z',
          },
        ],
        error: null,
      })),
    );
    const rows = await repo.listMuteFilters();
    expect(rows[0]?.filterId).toBe('f1');
  });
});
