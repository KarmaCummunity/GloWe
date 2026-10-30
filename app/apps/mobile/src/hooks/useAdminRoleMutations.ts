// app/apps/mobile/src/hooks/useAdminRoleMutations.ts
// FR-ADMIN-016 — grant/revoke admin role mutations with cache invalidation.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { GrantableAdminRole } from '@kc/domain';
import { container } from '../lib/container';

export interface GrantAdminRoleVars {
  readonly targetUserId: string;
  readonly role: GrantableAdminRole;
}

export function useGrantAdminRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: GrantAdminRoleVars) =>
      container.grantAdminRole.execute({
        targetUserId: vars.targetUserId,
        role: vars.role,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin.admins.list'] });
      void qc.invalidateQueries({ queryKey: ['admin.roles'] });
      // Tree + layered hierarchy views (FR-ADMIN-025/028) read the same grants.
      void qc.invalidateQueries({ queryKey: ['admin.org.tree'] });
    },
  });
}

export function useRevokeAdminRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (grantId: string) =>
      container.revokeAdminRole.execute({ grantId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin.admins.list'] });
      void qc.invalidateQueries({ queryKey: ['admin.roles'] });
      // Tree + layered hierarchy views (FR-ADMIN-025/028) read the same grants.
      void qc.invalidateQueries({ queryKey: ['admin.org.tree'] });
    },
  });
}
