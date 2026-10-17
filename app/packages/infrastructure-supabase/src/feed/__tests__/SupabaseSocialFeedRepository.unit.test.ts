import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseSocialFeedRepository } from '../SupabaseSocialFeedRepository';

/* eslint-disable @typescript-eslint/no-explicit-any */

function repo(result: { data: unknown; error: unknown }) {
  const rpc = vi.fn(async () => result);
  return { r: new SupabaseSocialFeedRepository({ rpc } as unknown as SupabaseClient<any>), rpc };
}
const fail = () => repo({ data: null, error: { message: 'bad' } }).r;

describe('SupabaseSocialFeedRepository', () => {
  it('hidePost', async () => {
    const { r, rpc } = repo({ data: null, error: null });
    await r.hidePost('p1');
    expect(rpc).toHaveBeenCalledWith('rpc_feed_hide_post', { p_post_id: 'p1' });
    await expect(fail().hidePost('p1')).rejects.toThrow('hidePost: bad');
  });

  it('logImpressions skips empty and forwards ids', async () => {
    const { r, rpc } = repo({ data: null, error: null });
    await r.logImpressions([]);
    expect(rpc).not.toHaveBeenCalled();
    await r.logImpressions(['a', 'b']);
    expect(rpc).toHaveBeenCalledWith('rpc_feed_log_impressions', { p_post_ids: ['a', 'b'] });
    await expect(fail().logImpressions(['a'])).rejects.toThrow('logImpressions: bad');
  });

  it('listMuteFilters maps rows', async () => {
    const { r } = repo({
      data: [{ filter_id: 'f1', filter_kind: 'keyword', filter_value: 'x', created_at: 't' }],
      error: null,
    });
    await expect(r.listMuteFilters()).resolves.toEqual([
      { filterId: 'f1', filterKind: 'keyword', filterValue: 'x', createdAt: 't' },
    ]);
    await expect(repo({ data: null, error: null }).r.listMuteFilters()).resolves.toEqual([]);
    await expect(fail().listMuteFilters()).rejects.toThrow('listMuteFilters: bad');
  });

  it('add/remove mute filter', async () => {
    const { r, rpc } = repo({ data: null, error: null });
    await r.addMuteFilter('user', 'u1');
    await r.removeMuteFilter('f1');
    expect(rpc).toHaveBeenCalledWith('rpc_feed_add_mute_filter', { p_filter_kind: 'user', p_filter_value: 'u1' });
    expect(rpc).toHaveBeenCalledWith('rpc_feed_remove_mute_filter', { p_filter_id: 'f1' });
    await expect(fail().addMuteFilter('world', 'w')).rejects.toThrow('addMuteFilter: bad');
    await expect(fail().removeMuteFilter('f')).rejects.toThrow('removeMuteFilter: bad');
  });
});
