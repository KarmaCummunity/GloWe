import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseActiveStatusRepository } from '../SupabaseActiveStatusRepository';

/* eslint-disable @typescript-eslint/no-explicit-any */

function repo(result: { data: unknown; error: { message: string } | null }) {
  const rpc = vi.fn(async () => result);
  return { rpc, r: new SupabaseActiveStatusRepository({ rpc } as unknown as SupabaseClient<any>) };
}

describe('SupabaseActiveStatusRepository', () => {
  it('get reads the owner flag', async () => {
    const { rpc, r } = repo({ data: false, error: null });
    expect(await r.get()).toBe(false);
    expect(rpc).toHaveBeenCalledWith('rpc_get_show_active_status');
  });

  it('get defaults to true when null', async () => {
    expect(await repo({ data: null, error: null }).r.get()).toBe(true);
  });

  it('set writes the flag and returns the stored value', async () => {
    const { rpc, r } = repo({ data: false, error: null });
    expect(await r.set(false)).toBe(false);
    expect(rpc).toHaveBeenCalledWith('rpc_set_show_active_status', { p_enabled: false });
  });

  it('wraps errors', async () => {
    await expect(repo({ data: null, error: { message: 'boom' } }).r.get()).rejects.toThrow('getShowActiveStatus: boom');
    await expect(repo({ data: null, error: { message: 'nope' } }).r.set(true)).rejects.toThrow('setShowActiveStatus: nope');
  });
});
