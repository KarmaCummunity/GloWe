// Mapped to spec: FR-FEED-020 AC2. State and data of a giving world's feed: the seeker / offerer
// mode, the search box, the subcategory + distance refinements, and the paged listings they
// select (keyset browse 0410, or the hybrid search 0411 once two characters are typed).
import { useMemo, useState } from 'react';
import { DEFAULT_BROWSE_RADIUS_KM } from '../components/marketplace/BrowseRefineChips';
import {
  DEFAULT_WORLD_FEED_MODE,
  feedDirectionFor,
  rowsForMode,
  type WorldFeedMode,
} from '../lib/worldFeed/worldFeedMode';
import { flattenPages, useMarketplaceBrowse, useMarketplaceSearchResults } from './useMarketplaceBrowse';
import { useDebouncedValue } from './useDebouncedValue';
import { usePrefetchNextPage } from './usePrefetchNextPage';

/** Shortest query the hybrid search accepts (0411). */
const SEARCH_MIN_CHARS = 2;
const SEARCH_DEBOUNCE_MS = 250;

export function useWorldFeed(worldSlug: string) {
  const [mode, setMode] = useState<WorldFeedMode>(DEFAULT_WORLD_FEED_MODE);
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(DEFAULT_BROWSE_RADIUS_KM);

  // Debounced so typing does not fire one search per keystroke.
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const searching = debouncedQuery.trim().length >= SEARCH_MIN_CHARS;

  const filters = useMemo(
    () => ({ worldSlug, direction: feedDirectionFor(mode), categoryId, radiusKm }),
    [worldSlug, mode, categoryId, radiusKm],
  );
  const browse = useMarketplaceBrowse(filters);
  const search = useMarketplaceSearchResults(debouncedQuery, worldSlug);
  const active = searching ? search : browse;
  usePrefetchNextPage(active);

  const rows = useMemo(() => rowsForMode(flattenPages(active.data), mode), [active.data, mode]);

  const loadMore = () => {
    if (active.hasNextPage && !active.isFetchingNextPage) void active.fetchNextPage();
  };

  return {
    mode,
    setMode,
    query,
    setQuery,
    searching,
    categoryId,
    setCategoryId,
    radiusKm,
    setRadiusKm,
    rows,
    isLoading: active.isLoading,
    isError: active.isError,
    isRefetching: active.isRefetching,
    refetch: () => void active.refetch(),
    loadMore,
  };
}
