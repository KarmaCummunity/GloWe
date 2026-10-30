import { describe, it, expect } from 'vitest';
import {
  HIERARCHY_TIERS,
  buildHierarchyPyramid,
  hierarchyTierOf,
  type HierarchyCensus,
  type HierarchyTier,
} from '../HierarchyPyramid';
import type { OrgTreeMember } from '../OrgTree';

const PLATFORM = 'org-platform';

function member(over: Partial<OrgTreeMember> & { grantId: string }): OrgTreeMember {
  return {
    userId: `u-${over.grantId}`,
    displayName: over.grantId,
    avatarUrl: null,
    role: 'org_volunteer',
    scopeOrgId: 'org-a',
    orgId: 'org-a',
    orgName: 'Alpha',
    isPlatform: false,
    managerGrantId: null,
    lastSeenAt: null,
    ...over,
  };
}

function platformMember(over: Partial<OrgTreeMember> & { grantId: string }): OrgTreeMember {
  return member({ scopeOrgId: null, orgId: PLATFORM, orgName: 'Karma Community', isPlatform: true, ...over });
}

const CENSUS: HierarchyCensus = {
  communityTotal: 100,
  roleHolderTotal: 6,
  orgs: [
    { orgId: PLATFORM, name: 'Karma Community', isPlatform: true, isVerified: true, affiliatedCount: 0 },
    { orgId: 'org-a', name: 'Alpha', isPlatform: false, isVerified: true, affiliatedCount: 4 },
    { orgId: 'org-b', name: 'Beta', isPlatform: false, isVerified: false, affiliatedCount: 1 },
  ],
};

function layer(pyramid: ReturnType<typeof buildHierarchyPyramid>, tier: HierarchyTier) {
  const found = pyramid.layers.find((l) => l.tier === tier);
  expect(found).toBeDefined();
  return found!;
}

describe('hierarchyTierOf', () => {
  it('maps fixed roles to their stratum', () => {
    expect(hierarchyTierOf('super_admin', true)).toBe('leadership');
    expect(hierarchyTierOf('moderator', true)).toBe('platform_staff');
    expect(hierarchyTierOf('org_admin', false)).toBe('org_leadership');
    expect(hierarchyTierOf('volunteer_manager', false)).toBe('org_team');
    expect(hierarchyTierOf('org_volunteer', false)).toBe('volunteers');
  });

  it('places operations roles by scope', () => {
    expect(hierarchyTierOf('operator', true)).toBe('platform_staff');
    expect(hierarchyTierOf('operators_manager', false)).toBe('org_team');
  });
});

describe('buildHierarchyPyramid', () => {
  it('always returns every stratum in authority order, even when empty', () => {
    const pyramid = buildHierarchyPyramid({ members: [], census: CENSUS });
    expect(pyramid.layers.map((l) => l.tier)).toEqual([...HIERARCHY_TIERS]);
    expect(pyramid.layers.every((l) => l.headcount === 0)).toBe(true);
    expect(pyramid.visiblePeople).toBe(0);
  });

  it('computes the masked base from the census, never below zero', () => {
    const pyramid = buildHierarchyPyramid({ members: [], census: CENSUS });
    expect(pyramid.base).toEqual({ maskedCount: 94, affiliatedCount: 5, communityTotal: 100 });

    const inverted = buildHierarchyPyramid({
      members: [],
      census: { ...CENSUS, communityTotal: 2, roleHolderTotal: 5 },
    });
    expect(inverted.base.maskedCount).toBe(0);
  });

  it('groups people by org inside a stratum, platform org first', () => {
    const pyramid = buildHierarchyPyramid({
      members: [
        member({ grantId: 'b1', role: 'org_admin', orgId: 'org-b', scopeOrgId: 'org-b', orgName: 'Beta' }),
        member({ grantId: 'a1', role: 'org_manager' }),
        platformMember({ grantId: 'p1', role: 'super_admin' }),
      ],
      census: CENSUS,
    });
    expect(layer(pyramid, 'leadership').groups.map((g) => g.orgId)).toEqual([PLATFORM]);
    expect(layer(pyramid, 'org_leadership').groups.map((g) => g.orgName)).toEqual(['Alpha', 'Beta']);
  });

  it('merges a multi-role person into one entry per stratum, highest role first', () => {
    const pyramid = buildHierarchyPyramid({
      members: [
        platformMember({ grantId: 's1', userId: 'u-x', role: 'support' }),
        platformMember({ grantId: 'm1', userId: 'u-x', role: 'moderator' }),
      ],
      census: CENSUS,
    });
    const staff = layer(pyramid, 'platform_staff');
    expect(staff.headcount).toBe(1);
    expect(staff.groups[0]?.people[0]?.roles).toEqual(['moderator', 'support']);
    expect(pyramid.visiblePeople).toBe(1);
  });

  it('keeps one person in two strata when their roles span them', () => {
    const pyramid = buildHierarchyPyramid({
      members: [
        member({ grantId: 'g1', userId: 'u-y', role: 'org_admin' }),
        member({ grantId: 'g2', userId: 'u-y', role: 'org_volunteer' }),
      ],
      census: CENSUS,
    });
    expect(layer(pyramid, 'org_leadership').headcount).toBe(1);
    expect(layer(pyramid, 'volunteers').headcount).toBe(1);
    expect(pyramid.visiblePeople).toBe(1);
  });

  it('sorts people by role rank, then by name', () => {
    const pyramid = buildHierarchyPyramid({
      members: [
        member({ grantId: 'zed', role: 'org_employee' }),
        member({ grantId: 'amy', role: 'org_employee' }),
        member({ grantId: 'vm', role: 'volunteer_manager' }),
      ],
      census: CENSUS,
    });
    const names = layer(pyramid, 'org_team').groups[0]?.people.map((p) => p.displayName);
    expect(names).toEqual(['vm', 'amy', 'zed']);
  });

  it('narrows strata and affiliates to the focused org but keeps the community base', () => {
    const snapshot = {
      members: [
        platformMember({ grantId: 'p1', role: 'super_admin' }),
        member({ grantId: 'a1', role: 'org_admin' }),
      ],
      census: CENSUS,
    };
    const focused = buildHierarchyPyramid(snapshot, 'org-a');
    expect(layer(focused, 'leadership').headcount).toBe(0);
    expect(layer(focused, 'org_leadership').headcount).toBe(1);
    expect(focused.base).toEqual({ maskedCount: 94, affiliatedCount: 4, communityTotal: 100 });
    // The org summary always describes every visible org, regardless of focus.
    expect(focused.orgs.map((o) => [o.orgId, o.memberCount])).toEqual([
      [PLATFORM, 1], ['org-a', 1], ['org-b', 0],
    ]);
  });

  it('buckets platform members without a resolved org together', () => {
    const pyramid = buildHierarchyPyramid({
      members: [platformMember({ grantId: 'p1', role: 'moderator', orgId: null, orgName: null })],
      census: CENSUS,
    });
    const group = layer(pyramid, 'platform_staff').groups[0];
    expect(group?.isPlatform).toBe(true);
    expect(group?.people).toHaveLength(1);
  });
});
