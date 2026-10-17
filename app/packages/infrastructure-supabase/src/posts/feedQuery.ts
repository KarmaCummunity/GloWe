// feedQuery — extracted from SupabasePostRepository.getFeed so the repository
// stays under its file-size cap (TD-50). The distance-aware path replaces
// this select-builder logic in P1.2 Commit 2 via the feed_ranked_ids RPC.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { PostFeedFilter } from '@kc/application';
import type { Database } from '../database.types';
import { POST_SELECT_OWNER } from './mapPostRow';
import { decodeCursor } from './cursor';
import { feedTextSearchOrClause } from './applyFeedTextSearch';

// Return type is inferred so the Supabase PostgrestFilterBuilder<...> with all
// its nested generics doesn't need to be named here.
export function buildFeedQuery(
  client: SupabaseClient<Database>,
  filter: PostFeedFilter,
  cursor: string | undefined,
  pageLimit: number,
) {
  let q = client.from('posts').select(POST_SELECT_OWNER);

  // statusFilter: 'open' (default), 'closed' (delivered only), 'all'.
  const status = filter.statusFilter ?? 'open';
  if (status === 'all') {
    q = q.in('status', ['open', 'closed_delivered']);
  } else if (status === 'closed') {
    q = q.eq('status', 'closed_delivered');
  } else {
    q = q.eq('status', 'open');
  }

  if (filter.type) q = q.eq('type', filter.type);
  if (filter.categories?.length) q = q.in('category', filter.categories);
  if (filter.itemConditions?.length) q = q.in('item_condition', filter.itemConditions);
  if (filter.searchQuery) q = q.or(feedTextSearchOrClause(filter.searchQuery));
  // locationFilter is intentionally not handled here — any valid radius
  // request reaches us through the ranked RPC path. GetFeedUseCase already
  // drops incoherent locationFilters (missing city / radius<=0).

  const decoded = decodeCursor(cursor);
  const oldestFirst = filter.sortOrder === 'oldest';
  if (decoded?.postId) {
    // Keyset on (created_at, post_id): posts sharing a timestamp are neither
    // skipped nor repeated across pages. Values are validated by decodeCursor.
    const op = oldestFirst ? 'gt' : 'lt';
    const ts = `"${decoded.createdAt}"`; // quoted: ISO timestamps contain reserved `.` and `:`
    q = q.or(`created_at.${op}.${ts},and(created_at.eq.${ts},post_id.${op}.${decoded.postId})`);
  } else if (decoded) {
    q = oldestFirst
      ? q.gt('created_at', decoded.createdAt)
      : q.lt('created_at', decoded.createdAt);
  }
  q = q.order('created_at', { ascending: oldestFirst }).order('post_id', { ascending: oldestFirst });
  q = q.limit(pageLimit + 1);

  return q;
}
