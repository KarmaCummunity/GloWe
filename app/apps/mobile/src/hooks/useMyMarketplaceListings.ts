import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MyListingsCursor } from '@kc/application';
import { marketplaceRepository } from '../services/marketplaceComposition';

/** Keyset-paginated "My listings" (0413). */
export function useMyMarketplaceListings(pageSize = 30) {
  return useInfiniteQuery({
    queryKey: ['marketplace', 'my-listings', pageSize],
    queryFn: ({ pageParam }) => marketplaceRepository().listMyListingsPage(pageSize, pageParam),
    initialPageParam: null as MyListingsCursor | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 30_000,
  });
}

export function useInvalidateMyListings() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['marketplace', 'my-listings'] });
}

export function useProfileMarketplaceListings(ownerId: string | undefined) {
  return useQuery({
    queryKey: ['marketplace', 'profile-listings', ownerId],
    queryFn: () => marketplaceRepository().listProfileListings(ownerId!, 24),
    enabled: Boolean(ownerId),
    staleTime: 60_000,
  });
}
