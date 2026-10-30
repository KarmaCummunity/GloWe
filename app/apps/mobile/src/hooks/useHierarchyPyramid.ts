// app/apps/mobile/src/hooks/useHierarchyPyramid.ts
// FR-ADMIN-028 — layered hierarchy view across every visible organisation.
//
// One query loads the snapshot (role-holders + census); focusing an org is a
// pure in-memory re-fold, so switching orgs never waits on the network. The
// key lives under `admin.org.tree` so every mutation that invalidates the tree
// (grant, revoke, set manager) refreshes the pyramid too.
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { buildHierarchyPyramid, type HierarchyPyramid } from '@kc/domain';
import { container } from '../lib/container';

export interface HierarchyPyramidState {
  readonly pyramid: HierarchyPyramid | null;
  readonly isRefetching: boolean;
  readonly refetch: () => void;
  readonly error: unknown;
}

export function useHierarchyPyramid(focusOrgId: string | null): HierarchyPyramidState {
  const q = useQuery({
    queryKey: ['admin.org.tree', 'snapshot'],
    queryFn: () => container.getHierarchySnapshot.execute(),
    staleTime: 30_000,
  });
  const pyramid = useMemo(
    () => (q.data ? buildHierarchyPyramid(q.data, focusOrgId) : null),
    [q.data, focusOrgId],
  );
  return {
    pyramid,
    isRefetching: q.isRefetching,
    refetch: () => { void q.refetch(); },
    error: q.error,
  };
}
