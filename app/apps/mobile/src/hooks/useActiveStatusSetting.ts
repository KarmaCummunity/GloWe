// "Show my active status" (0419) — owner flag + optimistic toggle. Presence lifecycle reads
// the same query, so turning it off immediately leaves presence:online (reciprocal: we stop
// receiving too; the server rejects both directions while off).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { container } from '../lib/container';

export const activeStatusQueryKey = (userId: string | null | undefined) => ['active-status', userId ?? null] as const;

export function useActiveStatusSetting(userId: string | null | undefined) {
  const qc = useQueryClient();
  const key = activeStatusQueryKey(userId);
  const query = useQuery({
    queryKey: key,
    queryFn: () => container.activeStatus.get(),
    enabled: Boolean(userId),
    staleTime: 10 * 60_000,
  });
  const mutation = useMutation({
    mutationFn: (enabled: boolean) => container.activeStatus.set(enabled),
    onMutate: async (enabled) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<boolean>(key);
      qc.setQueryData(key, enabled);
      return { previous };
    },
    onError: (_err, _enabled, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.previous);
    },
    onSuccess: (stored) => qc.setQueryData(key, stored),
  });
  return {
    /** undefined while loading. */
    enabled: query.data,
    loading: query.isLoading,
    saving: mutation.isPending,
    setEnabled: (next: boolean) => mutation.mutate(next),
  };
}
