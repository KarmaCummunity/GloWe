import type { SupabaseClient } from '@supabase/supabase-js';
import type { IBlockRepository } from '@kc/application';
import type { Database } from '../database.types';

/** `public.blocks` — RLS lets a user read/insert/delete only rows where they are the blocker. */
export class SupabaseBlockRepository implements IBlockRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async isBlocking(blockerId: string, blockedId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data !== null;
  }

  async block(blockerId: string, blockedId: string): Promise<void> {
    const { error } = await this.client.from('blocks').insert({ blocker_id: blockerId, blocked_id: blockedId });
    // 23505: already blocked — treat as success (idempotent).
    if (error && error.code !== '23505') throw new Error(error.message);
  }

  async unblock(blockerId: string, blockedId: string): Promise<void> {
    const { error } = await this.client
      .from('blocks')
      .delete()
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId);
    if (error) throw new Error(error.message);
  }
}
