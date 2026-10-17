// Prefetch the next page of an infinite query as soon as the current one has
// rendered (after interactions), so scrolling past the first screen never waits
// on the network. Only the page right after the newest loaded page is fetched;
// FlashList's onEndReached (with a generous threshold) keeps it one page ahead.
import { useEffect } from 'react';
import { InteractionManager } from 'react-native';

interface InfiniteLike {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isFetching: boolean;
  fetchNextPage: () => unknown;
  data?: { pages: readonly unknown[] } | undefined;
}

export function usePrefetchNextPage(query: InfiniteLike, enabled = true, maxEagerPages = 2): void {
  const pageCount = query.data?.pages.length ?? 0;
  const canPrefetch =
    enabled && pageCount > 0 && pageCount < maxEagerPages && query.hasNextPage && !query.isFetching;
  useEffect(() => {
    if (!canPrefetch) return;
    const task = InteractionManager.runAfterInteractions(() => {
      void query.fetchNextPage();
    });
    return () => task.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canPrefetch, pageCount]);
}

/** onEndReachedThreshold used by long lists: start loading ~1.5 screens early. */
export const LIST_END_THRESHOLD = 1.5;
