// FR-POST-001 AC7 — the create form asks the server whether the member may publish in a world
// (housing needs ID verification, D30) and fails open when the answer cannot be read.
import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../database.types';
import { canPublishInWorld } from '../canPublishInWorld';

function client(userId: string | null, rpcResult: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(rpcResult);
  const c = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }) },
    rpc,
  } as unknown as SupabaseClient<Database>;
  return { c, rpc };
}

describe('canPublishInWorld', () => {
  it('asks has_world_permission for the signed-in member and the publish action', async () => {
    const { c, rpc } = client('u1', { data: false, error: null });
    await expect(canPublishInWorld(c, 'housing')).resolves.toBe(false);
    expect(rpc).toHaveBeenCalledWith('has_world_permission', {
      p_user: 'u1',
      p_world_slug: 'housing',
      p_action: 'publish',
    });
  });

  it('returns the server answer when it allows publishing', async () => {
    const { c } = client('u1', { data: true, error: null });
    await expect(canPublishInWorld(c, 'time')).resolves.toBe(true);
  });

  it('fails open on an RPC error or a non-boolean answer', async () => {
    await expect(canPublishInWorld(client('u1', { data: null, error: { message: 'x' } }).c, 'housing')).resolves.toBe(true);
    await expect(canPublishInWorld(client('u1', { data: 'yes', error: null }).c, 'housing')).resolves.toBe(true);
  });

  it('does not call the RPC without a signed-in member', async () => {
    const { c, rpc } = client(null, { data: false, error: null });
    await expect(canPublishInWorld(c, 'housing')).resolves.toBe(true);
    expect(rpc).not.toHaveBeenCalled();
  });
});
