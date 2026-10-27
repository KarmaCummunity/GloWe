// FR-RIDE-023 — rides hub feed query.
// Wraps `SearchRideListingsUseCase` in `useQuery` with filter-store inputs.
// V3.0.1 uses a flat fetch (limit 50); a future revision will switch to
// `useInfiniteQuery` once the server pagination is exercised across screens.
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { RideListingRow } from '@kc/application';
import { useAuthStore } from '../../../store/authStore';
import { getSearchRideListingsUseCase } from '../composition/ridesComposition';
import { useRidesFilterStore } from '../store/ridesFilterStore';

const DEFAULT_LIMIT = 50;

export interface UseRidesFeedResult {
  readonly rides: RideListingRow[];
  readonly isLoading: boolean;
  readonly isRefetching: boolean;
  readonly error: Error | null;
  readonly refetch: () => Promise<void>;
}

export function useRidesFeed(): UseRidesFeedResult {
  const viewerId = useAuthStore((s) => s.session?.userId ?? null);
  const searchQuery = useRidesFilterStore((s) => s.searchQuery);
  const originCityId = useRidesFilterStore((s) => s.originCityId);
  const destCityId = useRidesFilterStore((s) => s.destCityId);
  const mode = useRidesFilterStore((s) => s.mode);
  const departFrom = useRidesFilterStore((s) => s.departFrom);
  const departTo = useRidesFilterStore((s) => s.departTo);

  const query = useQuery({
    queryKey: [
      'rides',
      'feed',
      viewerId,
      searchQuery,
      originCityId,
      destCityId,
      mode,
      departFrom,
      departTo,
    ],
    queryFn: async () => {
      if (!viewerId) return [] as RideListingRow[];
      const useCase = getSearchRideListingsUseCase();
      // Search RPC validates: only forward non-empty query ≥ 2 chars per FR-RIDE-002 AC3.
      const q = searchQuery.trim();
      return await useCase.execute({
        viewerId,
        query: q.length >= 2 ? q : null,
        originCityId,
        destCityId,
        mode,
        departFrom,
        departTo,
        limit: DEFAULT_LIMIT,
      });
    },
    enabled: Boolean(viewerId),
    staleTime: 30_000,
    // Refetch when the screen regains focus so a freshly-published ride appears.
    refetchOnWindowFocus: true,
  });

  return useMemo(
    () => ({
      rides: query.data ?? [],
      isLoading: query.isLoading,
      isRefetching: query.isFetching && !query.isLoading,
      error: (query.error as Error | null) ?? null,
      refetch: async () => {
        await query.refetch();
      },
    }),
    [query.data, query.isLoading, query.isFetching, query.error, query.refetch],
  );
}
