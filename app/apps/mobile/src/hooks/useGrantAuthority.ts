// app/apps/mobile/src/hooks/useGrantAuthority.ts
// FR-ADMIN-030 — the viewer's grant authority for the team-management UI.
//
// Combines the viewer's own active grants (from the RBAC-scoped org tree) with
// the orgs they can see (from the hierarchy census), so screens can offer only
// the roles and orgs the server's `can_grant_role` will accept.
import { useMemo } from 'react';
import { grantableRolesIn, type AuthorityGrant } from '@kc/domain';
import { useAuthStore } from '../store/authStore';
import { useOrgTree } from './useOrgTree';
import { useHierarchyPyramid } from './useHierarchyPyramid';

/** A place a role can be granted: the platform (scope null) or one org. */
export interface GrantScopeOption {
  readonly scopeOrgId: string | null;
  readonly name: string;
}

export interface GrantAuthorityState {
  readonly viewer: readonly AuthorityGrant[];
  /** Scopes in which the viewer may grant at least one role, platform first. */
  readonly scopes: readonly GrantScopeOption[];
  readonly isLoading: boolean;
}

export function useGrantAuthority(): GrantAuthorityState {
  const userId = useAuthStore((s) => s.session?.userId ?? null);
  const tree = useOrgTree(null, userId !== null);
  const { pyramid } = useHierarchyPyramid(null);

  const viewer = useMemo<AuthorityGrant[]>(
    () => tree.members
      .filter((m) => m.userId === userId)
      .map((m) => ({ role: m.role, scopeOrgId: m.scopeOrgId })),
    [tree.members, userId],
  );

  const scopes = useMemo<GrantScopeOption[]>(() => {
    // The platform org row stands for platform grants, whose scope is null.
    const options = (pyramid?.orgs ?? []).map((org) => ({
      scopeOrgId: org.isPlatform ? null : org.orgId,
      name: org.name,
    }));
    return options.filter((o) => grantableRolesIn(viewer, o.scopeOrgId).length > 0);
  }, [pyramid?.orgs, viewer]);

  return { viewer, scopes, isLoading: tree.isLoading || pyramid === null };
}
