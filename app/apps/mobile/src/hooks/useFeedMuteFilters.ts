// Feed mute filters (0281/0283): list + add/remove with optimistic updates; refreshes the feed.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { container } from '../lib/container';
import { useAuthStore } from '../store/authStore';
import { hapticLightTap } from '../lib/haptics';
import type { MuteFilter, MuteKind } from '../lib/feedMuteFilters';

export function useFeedMuteFilters() {
  const userId = useAuthStore((s) => s.session?.userId ?? null);
  const qc = useQueryClient();
  const queryKey = ['feed-mute-filters', userId] as const;

  const list = useQuery({
    queryKey,
    enabled: Boolean(userId),
    queryFn: async (): Promise<MuteFilter[]> => container.socialFeed.listMuteFilters(),
    staleTime: 60_000,
  });

  const settle = async () => {
    await qc.invalidateQueries({ queryKey });
    await qc.invalidateQueries({ queryKey: ['feed'] });
  };

  const add = useMutation({
    mutationFn: ({ kind, value }: { kind: MuteKind; value: string }) =>
      container.socialFeed.addMuteFilter(kind, value),
    onMutate: async ({ kind, value }) => {
      hapticLightTap();
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<MuteFilter[]>(queryKey);
      qc.setQueryData<MuteFilter[]>(queryKey, (old) => [
        ...(old ?? []),
        { filterId: `optimistic-${kind}-${value}`, filterKind: kind, filterValue: value },
      ]);
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKey, ctx.previous);
    },
    onSettled: settle,
  });

  const remove = useMutation({
    mutationFn: (filterId: string) => container.socialFeed.removeMuteFilter(filterId),
    onMutate: async (filterId) => {
      hapticLightTap();
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<MuteFilter[]>(queryKey);
      qc.setQueryData<MuteFilter[]>(queryKey, (old) => (old ?? []).filter((r) => r.filterId !== filterId));
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKey, ctx.previous);
    },
    onSettled: settle,
  });

  return { list, add, remove };
}
