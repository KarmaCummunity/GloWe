// FR-RIDE-025 — participant rows authored by the viewer (rider surface).
// Realtime: subscribes to user-scoped status updates so transitions land live.
import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { RideParticipant } from '@kc/domain';
import { useAuthStore } from '../../../store/authStore';
import {
  getListUserRideRequestsUseCase,
  getRidesRealtime,
} from '../composition/ridesComposition';

export interface MyRequestsBuckets {
  /** `requested` rows — awaiting owner decision. */
  readonly pending: RideParticipant[];
  /** `approved` rows whose ride is in the future. */
  readonly approved: RideParticipant[];
  /** Everything else (rejected, cancelled, past approved). */
  readonly history: RideParticipant[];
}

export interface UseMyRideRequestsResult {
  readonly all: readonly RideParticipant[];
  readonly buckets: MyRequestsBuckets;
  readonly isLoading: boolean;
  readonly isRefetching: boolean;
  readonly refetch: () => Promise<void>;
}

export function useMyRideRequests(): UseMyRideRequestsResult {
  const viewerId = useAuthStore((s) => s.session?.userId ?? null);
  const queryClient = useQueryClient();
  const queryKey = ['rides', 'my-requests', viewerId];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!viewerId) return [] as RideParticipant[];
      return await getListUserRideRequestsUseCase().execute({ userId: viewerId });
    },
    enabled: Boolean(viewerId),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!viewerId) return undefined;
    const realtime = getRidesRealtime();
    const unsubscribe = realtime.subscribeToUserParticipantUpdates(viewerId, {
      onChange: () => {
        void queryClient.invalidateQueries({ queryKey });
      },
    });
    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerId, queryClient]);

  const all = (query.data ?? []) as readonly RideParticipant[];

  const buckets = useMemo<MyRequestsBuckets>(() => {
    const pending: RideParticipant[] = [];
    const approved: RideParticipant[] = [];
    const history: RideParticipant[] = [];
    for (const p of all) {
      if (p.status === 'requested') pending.push(p);
      else if (p.status === 'approved') approved.push(p);
      else history.push(p);
    }
    return { pending, approved, history };
  }, [all]);

  return {
    all,
    buckets,
    isLoading: query.isLoading,
    isRefetching: query.isFetching && !query.isLoading,
    refetch: async () => {
      await query.refetch();
    },
  };
}
