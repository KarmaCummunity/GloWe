// app/packages/domain/src/admin/GrantAuthority.ts
// FR-ADMIN-030 — who may grant, change or revoke which role, and where.
//
// Mirrors the database's `can_grant_role(granter, role, scope)` (migration
// 0173, FR-ADMIN-016) so the portal only offers actions the server will
// accept. The server stays the authority: it re-checks every call, so a
// stricter server rule only turns an offered action into a typed error.
//
// Pure domain logic — no I/O, fully unit-tested.
import type { AdminRole } from './AdminRole';
import {
  fitsGrantScope,
  GRANTABLE_ADMIN_ROLES,
  isGrantableAdminRole,
  type GrantableAdminRole,
} from './AdminGrant';

/** One of the viewer's own active grants: the input to every authority check. */
export interface AuthorityGrant {
  readonly role: AdminRole;
  readonly scopeOrgId: string | null;
}

/** The org team below an org admin or org manager (FR-ADMIN-016 matrix). */
const ORG_TEAM_ROLES: readonly GrantableAdminRole[] = [
  'org_manager', 'operators_manager', 'volunteer_manager',
  'org_employee', 'org_volunteer', 'operator',
];

/**
 * Roles an org-scoped grant may hand out inside its own org. Exhaustive by
 * type, so a new role fails compilation until its authority is decided.
 */
const GRANTS_WITHIN_ORG: Readonly<Record<AdminRole, readonly GrantableAdminRole[]>> = {
  super_admin:       [],
  moderator:         [],
  support:           [],
  org_admin:         ORG_TEAM_ROLES,
  org_manager:       ORG_TEAM_ROLES,
  volunteer_manager: ['volunteer_manager', 'org_volunteer'],
  operators_manager: ['operator'],
  org_employee:      [],
  operator:          [],
  org_volunteer:     [],
};

function isPlatformSuperAdmin(grant: AuthorityGrant): boolean {
  return grant.role === 'super_admin' && grant.scopeOrgId === null;
}

/**
 * Whether the viewer may grant `role` in `scopeOrgId` (null = platform).
 * The scope must fit the role, super_admin is never grantable, the platform
 * super_admin may grant anything else anywhere, and an org grant may grant
 * only its own team roles inside its own org.
 */
export function canGrantRole(
  viewer: readonly AuthorityGrant[],
  role: AdminRole,
  scopeOrgId: string | null,
): boolean {
  if (!isGrantableAdminRole(role) || !fitsGrantScope(role, scopeOrgId)) return false;
  if (viewer.some(isPlatformSuperAdmin)) return true;
  if (scopeOrgId === null) return false;
  return viewer.some((g) => g.scopeOrgId === scopeOrgId && GRANTS_WITHIN_ORG[g.role].includes(role));
}

/** Roles the viewer may grant in `scopeOrgId`, highest authority first. */
export function grantableRolesIn(
  viewer: readonly AuthorityGrant[],
  scopeOrgId: string | null,
): GrantableAdminRole[] {
  return GRANTABLE_ADMIN_ROLES.filter((role) => canGrantRole(viewer, role, scopeOrgId));
}

/**
 * Whether the viewer may revoke or re-role an existing grant: the same
 * authority as granting that grant's role in its scope (`admin_revoke_role`).
 */
export function canManageGrant(viewer: readonly AuthorityGrant[], grant: AuthorityGrant): boolean {
  return canGrantRole(viewer, grant.role, grant.scopeOrgId);
}

/**
 * Roles an existing grant may change into: grantable by the viewer in the
 * same scope, excluding the role it already has. Empty when the viewer has no
 * authority over the grant itself.
 */
export function changeTargetsFor(
  viewer: readonly AuthorityGrant[],
  grant: AuthorityGrant,
): GrantableAdminRole[] {
  if (!canManageGrant(viewer, grant)) return [];
  return grantableRolesIn(viewer, grant.scopeOrgId).filter((role) => role !== grant.role);
}
