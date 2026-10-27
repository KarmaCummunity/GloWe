import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseMatchRepository, mapMatchRow } from '../SupabaseMatchRepository';

/* eslint-disable @typescript-eslint/no-explicit-any */

const ROW = {
  candidate_id: 'c1', status: 'suggested', score: '0.7312', components: {}, distance_km: '4.30',
  world_slug: 'items', my_role: 'request', my_listing_id: 'l_me', my_listing_title: 'Looking for a sofa',
  other_listing_id: 'l_o', other_listing_title: 'Grey sofa', other_listing_summary: null,
  other_owner_id: 'u_o', other_owner_name: 'Alice', other_owner_avatar: null, other_owner_handle: 'alice',
  my_response: null, other_response: 'accepted', llm_reason: null, created_at: '2026-10-17T20:00:00Z',
};

function repo(result: { data: unknown; error: { message: string } | null }) {
  const rpc = vi.fn(async () => result);
  return { rpc, r: new SupabaseMatchRepository({ rpc } as unknown as SupabaseClient<any>) };
}

describe('mapMatchRow', () => {
  it('maps numerics, roles and responses', () => {
    const m = mapMatchRow(ROW as any);
    expect(m.score).toBeCloseTo(0.7312);
    expect(m.distanceKm).toBeCloseTo(4.3);
    expect(m.myRole).toBe('request');
    expect(m.otherResponse).toBe('accepted');
    expect(m.myResponse).toBeNull();
    expect(m.otherOwner).toEqual({ userId: 'u_o', displayName: 'Alice', avatarUrl: null, shareHandle: 'alice' });
  });

  it('normalises unknown status/response values and null distance', () => {
    const m = mapMatchRow({ ...ROW, status: 'weird', my_role: 'offer', distance_km: null, my_response: 'x' } as any);
    expect(m.status).toBe('suggested');
    expect(m.myRole).toBe('offer');
    expect(m.distanceKm).toBeNull();
    expect(m.myResponse).toBeNull();
  });
});

describe('SupabaseMatchRepository', () => {
  it('listMine calls rpc_my_matches with the limit', async () => {
    const { rpc, r } = repo({ data: [ROW], error: null });
    const out = await r.listMine(5);
    expect(rpc).toHaveBeenCalledWith('rpc_my_matches', { p_limit: 5 });
    expect(out).toHaveLength(1);
    expect(out[0]?.candidateId).toBe('c1');
  });

  it('listMine returns [] for null data and wraps errors', async () => {
    expect(await repo({ data: null, error: null }).r.listMine()).toEqual([]);
    await expect(repo({ data: null, error: { message: 'boom' } }).r.listMine()).rejects.toThrow('listMyMatches: boom');
  });

  it('respond sends the answer and parses the result', async () => {
    const { rpc, r } = repo({ data: { status: 'accepted', mutual: true }, error: null });
    expect(await r.respond('c1', 'accept')).toEqual({ status: 'accepted', mutual: true });
    expect(rpc).toHaveBeenCalledWith('rpc_match_respond', { p_candidate_id: 'c1', p_response: 'accept' });
    expect(await repo({ data: null, error: null }).r.respond('c1', 'decline')).toEqual({ status: '', mutual: false });
    await expect(repo({ data: null, error: { message: 'match_closed' } }).r.respond('c1', 'decline'))
      .rejects.toThrow('respondToMatch: match_closed');
  });

  it('refreshMine returns the recomputed count', async () => {
    const { rpc, r } = repo({ data: 3, error: null });
    expect(await r.refreshMine()).toBe(3);
    expect(rpc).toHaveBeenCalledWith('rpc_match_refresh_mine');
    await expect(repo({ data: null, error: { message: 'x' } }).r.refreshMine()).rejects.toThrow('refreshMyMatches: x');
  });
});
