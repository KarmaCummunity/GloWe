import { describe, expect, it } from 'vitest';
import type { AdminGrant } from '../AdminGrant';
import type { AdminRole } from '../AdminRole';
import { adminRoleRank, groupGrantsByUser } from '../AdminPerson';

function grant(over: Partial<AdminGrant> & Pick<AdminGrant, 'userId' | 'role'>): AdminGrant {
  return {
    grantId: `${over.userId}:${over.role}:${over.revokedAt ? 'r' : 'a'}`,
    userId: over.userId,
    displayName: over.displayName ?? 'User',
    avatarUrl: over.avatarUrl ?? null,
    role: over.role,
    scopeOrgId: over.scopeOrgId ?? null,
    grantedAt: over.grantedAt ?? new Date('2026-01-01T00:00:00Z'),
    grantedBy: over.grantedBy ?? null,
    grantedByDisplayName: over.grantedByDisplayName ?? null,
    revokedAt: over.revokedAt ?? null,
    revokedBy: over.revokedBy ?? null,
    lastSeenAt: over.lastSeenAt ?? null,
  };
}

describe('adminRoleRank', () => {
  it('orders super_admin above org roles', () => {
    expect(adminRoleRank('super_admin')).toBeLessThan(adminRoleRank('moderator'));
    expect(adminRoleRank('moderator')).toBeLessThan(adminRoleRank('org_volunteer'));
  });
});

describe('groupGrantsByUser', () => {
  it('folds multiple roles of one user into a single person with all active roles', () => {
    const people = groupGrantsByUser([
      grant({ userId: 'u1', role: 'support', displayName: 'Nave' }),
      grant({ userId: 'u1', role: 'moderator', displayName: 'Nave' }),
    ]);
    expect(people).toHaveLength(1);
    expect(people[0]!.userId).toBe('u1');
    // highest-first: moderator outranks support
    expect(people[0]!.activeRoles).toEqual<AdminRole[]>(['moderator', 'support']);
    expect(people[0]!.highestActiveRole).toBe('moderator');
    expect(people[0]!.hasActiveGrant).toBe(true);
  });

  it('marks a user with only revoked grants as fully revoked', () => {
    const people = groupGrantsByUser([
      grant({ userId: 'sys', role: 'super_admin', revokedAt: new Date('2026-02-01T00:00:00Z') }),
    ]);
    expect(people[0]!.hasActiveGrant).toBe(false);
    expect(people[0]!.activeRoles).toEqual([]);
    expect(people[0]!.highestActiveRole).toBeNull();
    expect(people[0]!.grants).toHaveLength(1);
  });

  it('sorts active people (by highest role) before fully-revoked people', () => {
    const people = groupGrantsByUser([
      grant({ userId: 'revoked', role: 'super_admin', revokedAt: new Date('2026-02-01T00:00:00Z') }),
      grant({ userId: 'mod', role: 'moderator' }),
      grant({ userId: 'sup', role: 'support' }),
    ]);
    expect(people.map((p) => p.userId)).toEqual(['mod', 'sup', 'revoked']);
  });

  it('uses the most recent lastSeenAt across a user\'s grants', () => {
    const people = groupGrantsByUser([
      grant({ userId: 'u1', role: 'moderator', lastSeenAt: new Date('2026-03-01T00:00:00Z') }),
      grant({ userId: 'u1', role: 'support', lastSeenAt: new Date('2026-03-10T00:00:00Z') }),
    ]);
    expect(people[0]!.lastSeenAt).toEqual(new Date('2026-03-10T00:00:00Z'));
  });

  it('does not double-count a role held both actively and revoked', () => {
    const people = groupGrantsByUser([
      grant({ userId: 'u1', role: 'moderator', revokedAt: new Date('2026-01-05T00:00:00Z') }),
      grant({ userId: 'u1', role: 'moderator' }),
    ]);
    expect(people[0]!.activeRoles).toEqual(['moderator']);
    expect(people[0]!.grants).toHaveLength(2);
  });
});
