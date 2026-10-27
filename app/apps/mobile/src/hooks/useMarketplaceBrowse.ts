import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type {
  MarketplaceBrowseCursor,
  MarketplaceBrowseFilters,
  MarketplaceSearchCursor,
} from '@kc/application';
import type { MarketplaceBrowseRow } from '@kc/domain';
import { marketplaceRepository } from '../services/marketplaceComposition';

const PAGE = 24;

/** Keyset-paginated browse (0410). Pages are appended; no OFFSET re-scans. */
export function useMarketplaceBrowse(filters: Omit<MarketplaceBrowseFilters, 'cursor' | 'offset'>) {
  return useInfiniteQuery({
    queryKey: ['marketplace-browse', filters],
    queryFn: ({ pageParam }) =>
      marketplaceRepository().browsePage({ ...filters, limit: filters.limit ?? PAGE, cursor: pageParam }),
    initialPageParam: null as MarketplaceBrowseCursor | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 30_000,
  });
}

/** Keyset-paginated search (0411); each page's cards load in one batched query. */
export function useMarketplaceSearchResults(query: string, worldSlug: string | null, limit = PAGE) {
  const trimmed = query.trim();
  return useInfiniteQuery({
    queryKey: ['marketplace-search', trimmed, worldSlug, limit],
    enabled: trimmed.length >= 2,
    queryFn: async ({ pageParam }) => {
      const page = await marketplaceRepository().searchPage(trimmed, worldSlug, limit, pageParam);
      const rows = await marketplaceRepository().getListingCards(page.rows);
      return { rows, nextCursor: page.nextCursor };
    },
    initialPageParam: null as MarketplaceSearchCursor | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 30_000,
  });
}

export function useMarketplaceRecommendations(limit = 8) {
  return useQuery({
    queryKey: ['marketplace-for-you', limit],
    queryFn: async () => {
      const ids = await marketplaceRepository().recommendForYou(limit);
      return marketplaceRepository().getListingCards(ids);
    },
  });
}

export function flattenPages(data: { pages: ReadonlyArray<{ rows: MarketplaceBrowseRow[] }> } | undefined) {
  return data?.pages.flatMap((p) => p.rows) ?? [];
}
