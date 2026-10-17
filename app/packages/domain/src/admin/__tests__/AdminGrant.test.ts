import { describe, expect, it } from 'vitest';
import {
  GRANTABLE_ADMIN_ROLES,
  isAdminGrantActive,
  isGrantableAdminRole,
  type AdminGrant,
} from '../AdminGrant';
import type { AdminRole } from '../AdminRole';

function grant(overrides: Partial<AdminGrant> = {}): AdminGrant {
  return {
    grantId: 'g1',
    userId: 'u1',
    displayName: 'Nave',
    avatarUrl: null,
    role: 'moderator',
    grantedAt: new Date('2026-01-01T00:00:00Z'),
    grantedBy: 'admin',
    grantedByDisplayName: 'Admin',
    revokedAt: null,
    revokedBy: null,
    lastSeenAt: null,
    ...overrides,
  };
}

describe('AdminGrant', () => {
  it('isAdminGrantActive is true when revokedAt is null', () => {
    expect(isAdminGrantActive(grant())).toBe(true);
  });

  it('isAdminGrantActive is false when revokedAt is set', () => {
    expect(isAdminGrantActive(grant({ revokedAt: new Date('2026-02-01T00:00:00Z') }))).toBe(false);
  });

  it('GRANTABLE_ADMIN_ROLES lists moderator and support only', () => {
    expect(GRANTABLE_ADMIN_ROLES).toEqual(['moderator', 'support']);
  });

  it('isGrantableAdminRole accepts moderator/support and rejects others', () => {
    expect(isGrantableAdminRole('moderator')).toBe(true);
    expect(isGrantableAdminRole('support')).toBe(true);
    expect(isGrantableAdminRole('super_admin' as AdminRole)).toBe(false);
    expect(isGrantableAdminRole('org_admin' as AdminRole)).toBe(false);
  });
});
