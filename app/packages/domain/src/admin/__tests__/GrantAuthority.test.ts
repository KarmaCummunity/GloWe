import { describe, expect, it } from 'vitest';
import {
  canGrantRole,
  canManageGrant,
  changeTargetsFor,
  grantableRolesIn,
  type AuthorityGrant,
} from '../GrantAuthority';

const SUPER: AuthorityGrant = { role: 'super_admin', scopeOrgId: null };
const MODERATOR: AuthorityGrant = { role: 'moderator', scopeOrgId: null };
const ADMIN_A: AuthorityGrant = { role: 'org_admin', scopeOrgId: 'org-a' };
const VOL_MANAGER_A: AuthorityGrant = { role: 'volunteer_manager', scopeOrgId: 'org-a' };
const OPS_MANAGER_A: AuthorityGrant = { role: 'operators_manager', scopeOrgId: 'org-a' };

describe('canGrantRole', () => {
  it('lets the platform super_admin grant every role but super_admin, in a fitting scope', () => {
    expect(canGrantRole([SUPER], 'moderator', null)).toBe(true);
    expect(canGrantRole([SUPER], 'org_admin', 'org-a')).toBe(true);
    expect(canGrantRole([SUPER], 'super_admin', null)).toBe(false);
  });

  it('rejects a scope that does not fit the role, even for super_admin', () => {
    expect(canGrantRole([SUPER], 'moderator', 'org-a')).toBe(false);
    expect(canGrantRole([SUPER], 'org_manager', null)).toBe(false);
  });

  it('keeps an org admin inside their own org team', () => {
    expect(canGrantRole([ADMIN_A], 'org_manager', 'org-a')).toBe(true);
    expect(canGrantRole([ADMIN_A], 'org_volunteer', 'org-a')).toBe(true);
    expect(canGrantRole([ADMIN_A], 'org_admin', 'org-a')).toBe(false);
    expect(canGrantRole([ADMIN_A], 'org_manager', 'org-b')).toBe(false);
    expect(canGrantRole([ADMIN_A], 'moderator', null)).toBe(false);
  });

  it('limits volunteer and operations managers to their own tier', () => {
    expect(canGrantRole([VOL_MANAGER_A], 'volunteer_manager', 'org-a')).toBe(true);
    expect(canGrantRole([VOL_MANAGER_A], 'org_volunteer', 'org-a')).toBe(true);
    expect(canGrantRole([VOL_MANAGER_A], 'org_employee', 'org-a')).toBe(false);
    expect(canGrantRole([OPS_MANAGER_A], 'operator', 'org-a')).toBe(true);
    expect(canGrantRole([OPS_MANAGER_A], 'org_volunteer', 'org-a')).toBe(false);
  });

  it('gives platform staff without super_admin no grant authority', () => {
    expect(canGrantRole([MODERATOR], 'support', null)).toBe(false);
    expect(canGrantRole([], 'org_volunteer', 'org-a')).toBe(false);
  });
});

describe('grantableRolesIn', () => {
  it('lists the roles a viewer may grant in an org, highest first', () => {
    expect(grantableRolesIn([VOL_MANAGER_A], 'org-a')).toEqual(['volunteer_manager', 'org_volunteer']);
    expect(grantableRolesIn([VOL_MANAGER_A], 'org-b')).toEqual([]);
  });

  it('lists only platform roles on the platform', () => {
    expect(grantableRolesIn([SUPER], null)).toEqual(['moderator', 'support']);
  });

  it('merges the authority of several grants in the same org', () => {
    expect(grantableRolesIn([VOL_MANAGER_A, OPS_MANAGER_A], 'org-a'))
      .toEqual(['volunteer_manager', 'operator', 'org_volunteer']);
  });
});

describe('canManageGrant / changeTargetsFor', () => {
  it('manages a grant only with authority over its role and scope', () => {
    expect(canManageGrant([ADMIN_A], { role: 'org_volunteer', scopeOrgId: 'org-a' })).toBe(true);
    expect(canManageGrant([ADMIN_A], { role: 'org_admin', scopeOrgId: 'org-a' })).toBe(false);
    expect(canManageGrant([SUPER], { role: 'super_admin', scopeOrgId: null })).toBe(false);
  });

  it('offers every other grantable role in the same scope', () => {
    expect(changeTargetsFor([VOL_MANAGER_A], { role: 'org_volunteer', scopeOrgId: 'org-a' }))
      .toEqual(['volunteer_manager']);
  });

  it('offers nothing when the grant itself is out of reach', () => {
    expect(changeTargetsFor([VOL_MANAGER_A], { role: 'org_employee', scopeOrgId: 'org-a' })).toEqual([]);
  });
});
