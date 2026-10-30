// app/packages/domain/src/admin/HierarchyPyramid.ts
// FR-ADMIN-028 — layered hierarchy ("pyramid") across every organisation.
//
// Folds two inputs into a stack of strata, top (authority) to bottom (reach):
//   • the RBAC-filtered role-holders from `admin_org_tree` (named people), and
//   • the aggregate census from `admin_hierarchy_census` (counts only).
//
// Every visible stratum is a list of org groups, and every group lists the
// people of that org in that stratum. A person who holds several roles in the
// same stratum and org appears once with all of those roles. The bottom of the
// pyramid is the masked community base: it carries counts, never identities.
//
// Pure domain logic — no I/O, fully unit-tested.
import type { AdminRole } from './AdminRole';
import { adminRoleRank } from './AdminPerson';
import type { OrgTreeMember } from './OrgTree';

/** Visible strata, highest authority first. */
export const HIERARCHY_TIERS = [
  'leadership',
  'platform_staff',
  'org_leadership',
  'org_team',
  'volunteers',
] as const;

export type HierarchyTier = (typeof HIERARCHY_TIERS)[number];

/** Per-org aggregate row from `admin_hierarchy_census`. */
export interface HierarchyOrgCensus {
  readonly orgId: string;
  readonly name: string;
  readonly isPlatform: boolean;
  readonly isVerified: boolean;
  /** Self-declared volunteer affiliations without a grant in this org. */
  readonly affiliatedCount: number;
}

export interface HierarchyCensus {
  /** Every active user on the platform. */
  readonly communityTotal: number;
  /** Distinct active users holding at least one active grant (platform-wide). */
  readonly roleHolderTotal: number;
  /** Orgs visible to the caller, platform org first. */
  readonly orgs: readonly HierarchyOrgCensus[];
}

/** Raw inputs of the pyramid, fetched together so they describe one moment. */
export interface HierarchySnapshot {
  readonly members: readonly OrgTreeMember[];
  readonly census: HierarchyCensus;
}

export interface LayerPerson {
  readonly userId: string;
  readonly displayName: string | null;
  readonly avatarUrl: string | null;
  /** Roles this person holds within the stratum + org, highest first. */
  readonly roles: readonly AdminRole[];
  readonly lastSeenAt: Date | null;
}

export interface LayerOrgGroup {
  readonly orgId: string;
  readonly orgName: string;
  readonly isPlatform: boolean;
  readonly people: readonly LayerPerson[];
}

export interface HierarchyLayer {
  readonly tier: HierarchyTier;
  /** Number of person entries across all groups in this stratum. */
  readonly headcount: number;
  readonly groups: readonly LayerOrgGroup[];
}

export interface HierarchyOrgSummary extends HierarchyOrgCensus {
  /** Distinct named role-holders of this org (visible strata only). */
  readonly memberCount: number;
}

export interface CommunityBase {
  /** Active users with no grant anywhere — shown masked, count only. */
  readonly maskedCount: number;
  /** Self-declared volunteers in the focused orgs (aggregate, unnamed). */
  readonly affiliatedCount: number;
  readonly communityTotal: number;
}

export interface HierarchyPyramid {
  /** Always one entry per `HIERARCHY_TIERS` value, in order (may be empty). */
  readonly layers: readonly HierarchyLayer[];
  readonly base: CommunityBase;
  /** Every visible org with its counts — drives the focus filter. */
  readonly orgs: readonly HierarchyOrgSummary[];
  /** Distinct named people across the (possibly focused) strata. */
  readonly visiblePeople: number;
}

/**
 * Stratum per role. Exhaustive by type, so adding a role to `AdminRole`
 * fails compilation until it is placed. `null` marks operations roles, whose
 * stratum depends on scope (see `hierarchyTierOf`).
 */
const ROLE_TIER: Readonly<Record<AdminRole, HierarchyTier | null>> = {
  super_admin:       'leadership',
  moderator:         'platform_staff',
  support:           'platform_staff',
  operators_manager: null,
  operator:          null,
  org_admin:         'org_leadership',
  org_manager:       'org_leadership',
  org_employee:      'org_team',
  volunteer_manager: 'org_team',
  org_volunteer:     'volunteers',
};

/**
 * Stratum of a single grant. Operations roles are scope-dependent: platform
 * operators are platform staff, org operators belong to that org's team.
 */
export function hierarchyTierOf(role: AdminRole, isPlatform: boolean): HierarchyTier {
  return ROLE_TIER[role] ?? (isPlatform ? 'platform_staff' : 'org_team');
}

/** Effective org of a member; platform roles without a resolved org share one bucket. */
const PLATFORM_FALLBACK_ORG = 'platform';

function orgKeyOf(member: OrgTreeMember): string {
  return member.orgId ?? PLATFORM_FALLBACK_ORG;
}

/** Mutable accumulator for one (tier, org) group while folding. */
interface GroupDraft {
  readonly orgId: string;
  readonly orgName: string;
  readonly isPlatform: boolean;
  readonly people: Map<string, { member: OrgTreeMember; roles: AdminRole[] }>;
}

function compareGroups(a: LayerOrgGroup, b: LayerOrgGroup): number {
  if (a.isPlatform !== b.isPlatform) return a.isPlatform ? -1 : 1;
  return a.orgName.localeCompare(b.orgName);
}

/** Rank of a person's highest role (roles are sorted, never empty). */
function topRank(person: LayerPerson): number {
  const top = person.roles[0];
  return top === undefined ? Number.MAX_SAFE_INTEGER : adminRoleRank(top);
}

function comparePeople(a: LayerPerson, b: LayerPerson): number {
  const rank = topRank(a) - topRank(b);
  if (rank !== 0) return rank;
  return (a.displayName ?? '').localeCompare(b.displayName ?? '');
}

function finalizeGroup(draft: GroupDraft): LayerOrgGroup {
  const people = [...draft.people.values()]
    .map(({ member, roles }) => ({
      userId: member.userId,
      displayName: member.displayName,
      avatarUrl: member.avatarUrl,
      roles: [...roles].sort((a, b) => adminRoleRank(a) - adminRoleRank(b)),
      lastSeenAt: member.lastSeenAt,
    }))
    .sort(comparePeople);
  return { orgId: draft.orgId, orgName: draft.orgName, isPlatform: draft.isPlatform, people };
}

/** Bucket members into `tier → org → person`, merging a person's roles. */
function bucketMembers(
  members: readonly OrgTreeMember[],
): Map<HierarchyTier, Map<string, GroupDraft>> {
  const tiers = new Map<HierarchyTier, Map<string, GroupDraft>>();
  for (const m of members) {
    const tier = hierarchyTierOf(m.role, m.isPlatform);
    const orgKey = orgKeyOf(m);
    const groups = tiers.get(tier) ?? new Map<string, GroupDraft>();
    tiers.set(tier, groups);
    const group = groups.get(orgKey) ?? {
      orgId: orgKey,
      orgName: m.orgName ?? '',
      isPlatform: m.isPlatform,
      people: new Map(),
    };
    groups.set(orgKey, group);
    const entry = group.people.get(m.userId);
    if (entry) {
      if (!entry.roles.includes(m.role)) entry.roles.push(m.role);
    } else {
      group.people.set(m.userId, { member: m, roles: [m.role] });
    }
  }
  return tiers;
}

function buildLayers(members: readonly OrgTreeMember[]): HierarchyLayer[] {
  const tiers = bucketMembers(members);
  return HIERARCHY_TIERS.map((tier) => {
    const groups = [...(tiers.get(tier)?.values() ?? [])].map(finalizeGroup).sort(compareGroups);
    const headcount = groups.reduce((sum, g) => sum + g.people.length, 0);
    return { tier, headcount, groups };
  });
}

function distinctUsers(members: readonly OrgTreeMember[]): number {
  return new Set(members.map((m) => m.userId)).size;
}

function summarizeOrgs(
  census: HierarchyCensus,
  members: readonly OrgTreeMember[],
): HierarchyOrgSummary[] {
  const usersByOrg = new Map<string, Set<string>>();
  for (const m of members) {
    const key = orgKeyOf(m);
    const set = usersByOrg.get(key) ?? new Set<string>();
    set.add(m.userId);
    usersByOrg.set(key, set);
  }
  return census.orgs.map((org) => ({
    ...org,
    memberCount: usersByOrg.get(org.orgId)?.size ?? 0,
  }));
}

/**
 * Build the pyramid. `focusOrgId` narrows the named strata and the affiliated
 * count to one org; the masked base always describes the whole community,
 * because the base is the platform's shared audience, not an org's.
 */
export function buildHierarchyPyramid(
  snapshot: HierarchySnapshot,
  focusOrgId: string | null = null,
): HierarchyPyramid {
  const { census } = snapshot;
  const members = focusOrgId === null
    ? snapshot.members
    : snapshot.members.filter((m) => orgKeyOf(m) === focusOrgId);
  const focusedOrgs = focusOrgId === null
    ? census.orgs
    : census.orgs.filter((o) => o.orgId === focusOrgId);

  return {
    layers: buildLayers(members),
    base: {
      maskedCount: Math.max(0, census.communityTotal - census.roleHolderTotal),
      affiliatedCount: focusedOrgs.reduce((sum, o) => sum + o.affiliatedCount, 0),
      communityTotal: census.communityTotal,
    },
    orgs: summarizeOrgs(census, snapshot.members),
    visiblePeople: distinctUsers(members),
  };
}
