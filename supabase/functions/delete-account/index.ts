// supabase/functions/delete-account/index.ts
// Edge Function for FR-SETTINGS-012 V1 — orchestrates the destructive flow:
//   1. verify JWT
//   2. call delete_account_data() RPC (DB cleanup, idempotent)
//   3. delete storage objects (post media + avatar from the RPC; every object
//      under the user's folder in the userId-first buckets USER_FOLDER_BUCKETS)
//   4. auth.admin.deleteUser() — frees email / Google identity
//
// Order matters: DB → storage → auth. If DB fails nothing changes. If storage
// fails the user is half-cleaned (acceptable; orphan cleanup deferred to V1.1).
// If auth fails the client must retry — UI hard-locks the modal in that case.
//
// POST (no body) → 200 { ok: true, counts }
//                → 401 { ok: false, error: 'unauthenticated' }
//                → 403 { ok: false, error: 'suspended' }
//                → 500 { ok: false, error: 'db_failed' | 'auth_delete_failed', counts? }

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { CORS_HEADERS, jsonResponse } from './cors.ts';
import { getAuthedUser } from './auth.ts';
import { type Handler, withTiming } from '../_shared/withTiming.ts';
import { chunkPaths, collectObjectPaths, type StorageListEntry } from './storageCleanup.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/**
 * Buckets whose objects live under `<user_id>/…` and are not tracked by the
 * delete RPC (chat images since 0440, listing images since 0333).
 */
const USER_FOLDER_BUCKETS = ['chat-media', 'listing-images'] as const;

/** Removes every object under `<userId>/` in `bucket`. Errors are logged, not thrown. */
async function purgeUserFolder(admin: SupabaseClient, bucket: string, userId: string): Promise<void> {
  const listPage = async (prefix: string, offset: number, limit: number): Promise<StorageListEntry[]> => {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit, offset });
    if (error) throw error;
    return (data ?? []) as StorageListEntry[];
  };
  const paths = await collectObjectPaths(listPage, userId);
  for (const chunk of chunkPaths(paths)) {
    const { error } = await admin.storage.from(bucket).remove(chunk);
    if (error) console.error(`[delete-account] ${bucket} cleanup failed`, error);
  }
}

interface RpcResult {
  media_paths: string[];
  avatar_path: string | null;
  counts: { posts: number; chats_anonymized: number; chats_dropped: number };
}

const handler: Handler = async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return jsonResponse({ ok: false, error: 'invalid_method' }, 405);

  const user = await getAuthedUser(req);
  if (!user) return jsonResponse({ ok: false, error: 'unauthenticated' }, 401);

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Step 1+2: DB cleanup via RPC (authenticated client so auth.uid() works).
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: user.authHeader } },
    auth: { persistSession: false },
  });
  const { data: rpcData, error: rpcErr } = await userClient.rpc('delete_account_data');
  if (rpcErr) {
    const msg = rpcErr.message ?? '';
    if (msg.includes('suspended')) return jsonResponse({ ok: false, error: 'suspended' }, 403);
    if (msg.includes('unauthenticated')) return jsonResponse({ ok: false, error: 'unauthenticated' }, 401);
    return jsonResponse({ ok: false, error: 'db_failed', detail: msg }, 500);
  }
  const rpc = rpcData as unknown as RpcResult;

  // Step 3: storage cleanup. Failures are logged, not fatal.
  try {
    if (rpc.media_paths.length > 0) {
      const { error: rmErr } = await adminClient.storage.from('post-images').remove(rpc.media_paths);
      if (rmErr) console.error('[delete-account] post-images cleanup failed', rmErr);
    }
    if (rpc.avatar_path) {
      const { error: avErr } = await adminClient.storage.from('avatars').remove([rpc.avatar_path]);
      if (avErr) console.error('[delete-account] avatar cleanup failed', avErr);
    }
    for (const bucket of USER_FOLDER_BUCKETS) {
      await purgeUserFolder(adminClient, bucket, user.id);
    }
  } catch (e) {
    console.error('[delete-account] storage cleanup threw', e);
  }

  // Step 4: free the auth identity. If this fails the user is in the
  // "DB clean, auth alive" state — client must retry from the modal.
  const { error: authErr } = await adminClient.auth.admin.deleteUser(user.id);
  if (authErr) {
    console.error('[delete-account] auth.admin.deleteUser failed', authErr);
    return jsonResponse({ ok: false, error: 'auth_delete_failed', counts: rpc.counts }, 500);
  }

  return jsonResponse({ ok: true, counts: rpc.counts }, 200);
};

serve(withTiming('delete-account', handler));
