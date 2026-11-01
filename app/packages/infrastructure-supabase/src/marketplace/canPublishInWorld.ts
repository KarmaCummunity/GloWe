import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';

/**
 * Whether the signed-in member may publish in a giving world, as the server decides it
 * (`has_world_permission`, migration 0264: world active, verification for housing / medical
 * (D30), operator and super-admin overrides). FR-POST-001 AC7.
 *
 * Fails open (true) when the answer cannot be read: the check only spares the member a form
 * they cannot submit, and the server still enforces the rule on publish
 * (`world_permission_denied`).
 */
export async function canPublishInWorld(client: SupabaseClient<Database>, worldSlug: string): Promise<boolean> {
  const { data: auth } = await client.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return true;
  const { data, error } = await client.rpc('has_world_permission', {
    p_user: userId,
    p_world_slug: worldSlug,
    p_action: 'publish',
  });
  if (error || typeof data !== 'boolean') return true;
  return data;
}
