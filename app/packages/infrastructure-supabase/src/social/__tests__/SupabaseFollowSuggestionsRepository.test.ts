import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseFollowSuggestionsRepository } from '../SupabaseFollowSuggestionsRepository';

/* eslint-disable @typescript-eslint/no-explicit-any */

function makeClient(
  rpcImpl: (fn: string, args?: unknown) => Promise<{ data: unknown; error: { message: string } | null }>,
): SupabaseClient<any> {
  return { rpc: rpcImpl } as unknown as SupabaseClient<any>;
}

describe('SupabaseFollowSuggestionsRepository', () => {
  it('listSuggestions maps RPC rows', async () => {
    const repo = new SupabaseFollowSuggestionsRepository(
      makeClient(async () => ({
        data: [
          {
            user_id: 'u1',
            display_name: 'A',
            share_handle: 'a',
            avatar_url: null,
            city_name: 'TLV',
            followers_count: 4,
            reason: 'mutual',
          },
        ],
        error: null,
      })),
    );
    const rows = await repo.listSuggestions(5);
    expect(rows[0]?.userId).toBe('u1');
    expect(rows[0]?.reason).toBe('mutual');
  });

  it('getProfileCompleteness maps fields', async () => {
    const repo = new SupabaseFollowSuggestionsRepository(
      makeClient(async () => ({
        data: { score: 80, missing: ['avatar'], verified: true, showVerifiedBadge: false },
        error: null,
      })),
    );
    await expect(repo.getProfileCompleteness('u1')).resolves.toEqual({
      score: 80,
      missing: ['avatar'],
      verified: true,
      showVerifiedBadge: false,
    });
  });
});
