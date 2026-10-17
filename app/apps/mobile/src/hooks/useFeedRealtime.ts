// useFeedRealtime — manages the IFeedRealtime subscription lifecycle for the
// Home Feed. Subscribes on mount; unsubscribes after the app has been in the
// background for >60s; on resume does an incremental gap-fill (posts newer
// than `lastSeenAtRef`) instead of a full refetch.
//
// Mapped to FR-FEED-009.

import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { PostFeedFilter, FeedPage, NewPublicPostSignal } from '@kc/application';
import { getFeedRealtime, getFeedUseCase } from '../services/postsComposition';
import { useFeedSessionStore } from '../store/feedSessionStore';
import { shouldCountNewPost } from '../lib/feedNewPosts';

const BACKGROUND_DISCONNECT_MS = 60_000;
const GAP_FILL_LIMIT = 50;

export interface UseFeedRealtimeOptions {
  queryClient: QueryClient;
  queryKey: readonly unknown[];
  viewerId: string | null;
  feedFilter: PostFeedFilter;
}

export function useFeedRealtime(opts: UseFeedRealtimeOptions): void {
  const { queryClient, viewerId } = opts;
  const incrementNewPosts = useFeedSessionStore((s) => s.incrementNewPosts);

  // Latest options in a ref: the caller passes a fresh `queryKey` array every
  // render, and keying the subscription effect on it re-created the realtime
  // channel on every render (scroll, viewability, keystrokes).
  const optsRef = useRef(opts);
  optsRef.current = opts;

  // Track the createdAt of the most recent post we have seen.
  const lastSeenAtRef = useRef<string | null>(null);
  useEffect(() => {
    const cached = queryClient.getQueryData<InfiniteData<FeedPage>>(optsRef.current.queryKey);
    const first = cached?.pages[0]?.posts[0]?.createdAt ?? null;
    if (first && (!lastSeenAtRef.current || first > lastSeenAtRef.current)) {
      lastSeenAtRef.current = first;
    }
  });

  useEffect(() => {
    const realtime = getFeedRealtime();
    const counted = new Set<string>();
    const onNewPublicPost = (post: NewPublicPostSignal) => {
      if (!shouldCountNewPost(post, viewerId, counted)) return;
      lastSeenAtRef.current = lastSeenAtRef.current ?? new Date().toISOString();
      incrementNewPosts();
    };

    let unsubscribe: (() => void) | null = realtime.subscribeToPublicInserts({ onNewPublicPost });
    let backgroundTimer: ReturnType<typeof setTimeout> | null = null;

    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        if (!backgroundTimer && unsubscribe) {
          backgroundTimer = setTimeout(() => {
            backgroundTimer = null;
            unsubscribe?.();
            unsubscribe = null;
          }, BACKGROUND_DISCONNECT_MS);
        }
        return;
      }
      if (backgroundTimer) {
        clearTimeout(backgroundTimer);
        backgroundTimer = null;
      }
      // Only resubscribe + gap-fill if the 60s timer actually tore us down.
      if (!unsubscribe) {
        unsubscribe = realtime.subscribeToPublicInserts({ onNewPublicPost });
        const { queryKey, feedFilter } = optsRef.current;
        void performGapFill({ queryClient, queryKey, viewerId, feedFilter, lastSeenAt: lastSeenAtRef.current });
      }
    });

    return () => {
      if (backgroundTimer) clearTimeout(backgroundTimer);
      sub.remove();
      unsubscribe?.();
      unsubscribe = null;
    };
  }, [incrementNewPosts, queryClient, viewerId]);
}

interface GapFillParams {
  queryClient: QueryClient;
  queryKey: readonly unknown[];
  viewerId: string | null;
  feedFilter: PostFeedFilter;
  lastSeenAt: string | null;
}

async function performGapFill(params: GapFillParams): Promise<void> {
  const { queryClient, queryKey, viewerId, feedFilter, lastSeenAt } = params;

  // Cold case: no prior data — nothing to prepend; the existing query handles it.
  if (!lastSeenAt) return;

  const page = await getFeedUseCase().execute({
    viewerId,
    filter: feedFilter,
    limit: GAP_FILL_LIMIT,
  });

  const newPosts = page.posts.filter((p) => p.createdAt > lastSeenAt);
  if (newPosts.length === 0) return;

  queryClient.setQueryData<InfiniteData<FeedPage>>(queryKey, (prev) => {
    if (!prev) return prev;

    const firstPage = prev.pages[0];
    if (!firstPage) return prev;

    // Dedupe: remove from existing list any id already in the incoming batch.
    const incomingIds = new Set(newPosts.map((p) => p.postId));
    const deduped = firstPage.posts.filter((p) => !incomingIds.has(p.postId));

    return {
      ...prev,
      pages: [{ ...firstPage, posts: [...newPosts, ...deduped] }, ...prev.pages.slice(1)],
    };
  });
}
