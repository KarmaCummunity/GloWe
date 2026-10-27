// FR-RIDE-024 — driver dashboard data hook.
// Returns rides owned by the viewer, grouped into Upcoming / Past buckets.
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { RideListingRow } from '@kc/application';
import { useAuthStore } from '../../../store/authStore';
import { getListMyRidesUseCase } from '../composition/ridesComposition';

export interface MyRidesBuckets {
  readonly upcoming: RideListingRow[];
  readonly past: RideListingRow[];
}

export interface UseMyRidesResult {
  readonly buckets: MyRidesBuckets;
  readonly all: RideListingRow[];
  readonly isLoading: boolean;
  readonly isRefetching: boolean;
  readonly error: Error | null;
  readonly refetch: () => Promise<void>;
}

export function useMyRides(): UseMyRidesResult {
  const viewerId = useAuthStore((s) => s.session?.userId ?? null);

  const query = useQuery({
    queryKey: ['rides', 'my-rides', viewerId],
    queryFn: async () => {
      if (!viewerId) return [] as RideListingRow[];
      return await getListMyRidesUseCase().execute({ ownerId: viewerId });
    },
    enabled: Boolean(viewerId),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const rides = query.data ?? [];

  const buckets = useMemo<MyRidesBuckets>(() => {
    const nowTs = Date.now();
    const upcoming: RideListingRow[] = [];
    const past: RideListingRow[] = [];
    for (const r of rides) {
      const tsForBucket = new Date(r.departsAt).getTime();
      if (r.status === 'open' && tsForBucket >= nowTs) upcoming.push(r);
      else past.push(r);
    }
    // Upcoming: soonest first. Past: most recent first (already from query).
    upcoming.sort((a, b) => new Date(a.departsAt).getTime() - new Date(b.departsAt).getTime());
    return { upcoming, past };
  }, [rides]);

  return {
    buckets,
    all: rides,
    isLoading: query.isLoading,
    isRefetching: query.isFetching && !query.isLoading,
    error: (query.error as Error | null) ?? null,
    refetch: async () => {
      await query.refetch();
    },
  };
}
