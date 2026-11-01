// supabase/functions/delete-account/index.ts
// Edge Function for FR-SETTINGS-012 V1 — orchestrates the destructive flow:
//   1. verify JWT
//   2. call delete_account_data() RPC (DB cleanup, idempotent)
//   3. delete storage objects (the post media paths the RPC returns, then every
//      object under the user's folder in the USER_FOLDER_BUCKETS)
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
import { type Handler, reportError, withObservability } from '../_shared/observability/mod.ts';
import { purgeUserFolders, type StorageGateway, type StorageListEntry } from './storageCleanup.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/** Adapts the service-role Storage client to the purge's gateway (errors reject). */
function storageGateway(admin: SupabaseClient): StorageGateway {
  return {
    async list(bucket, prefix, offset, limit) {
      const { data, error } = await admin.storage.from(bucket).list(prefix, { limit, offset });
      if (error) throw error;
      return (data ?? []) as StorageListEntry[];
    },
    async remove(bucket, paths) {
      const { error } = await admin.storage.from(bucket).remove(paths);
      if (error) throw error;
    },
  };
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
      if (rmErr) {
        await reportError(rmErr, { fn: 'delete-account', req, tags: { stage: 'storage_cleanup', bucket: 'post-images' } });
      }
    }
    // The avatar (and its thumb) is purged with the user's folder: `avatar_path` holds
    // the public URL the profile shows, not a Storage object path.
    await purgeUserFolders(storageGateway(adminClient), user.id, (error, bucket) =>
      reportError(error, { fn: 'delete-account', req, tags: { stage: 'storage_cleanup', bucket } }),
    );
  } catch (e) {
    await reportError(e, { fn: 'delete-account', req, tags: { stage: 'storage_cleanup' } });
  }

  // Step 4: free the auth identity. If this fails the user is in the
  // "DB clean, auth alive" state — client must retry from the modal.
  const { error: authErr } = await adminClient.auth.admin.deleteUser(user.id);
  if (authErr) {
    await reportError(authErr, { fn: 'delete-account', req, tags: { stage: 'auth_delete' } });
    return jsonResponse({ ok: false, error: 'auth_delete_failed', counts: rpc.counts }, 500);
  }

  return jsonResponse({ ok: true, counts: rpc.counts }, 200);
};

serve(withObservability('delete-account', handler));
