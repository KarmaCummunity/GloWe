// app/apps/mobile/src/i18n/locales/en/modules/adminLayers.ts
// English strings for the layered hierarchy view of the admin team (FR-ADMIN-028).
export const adminLayersEn = {
  tiers: {
    leadership:     { title: 'Platform Leadership', hint: 'The Karma Community super admin' },
    platform_staff: { title: 'Platform Staff',      hint: 'Moderators, support and platform operators' },
    org_leadership: { title: 'Org Leadership',      hint: 'Organization admins and managers' },
    org_team:       { title: 'Org Teams',           hint: 'Employees, volunteer managers and org operators' },
    volunteers:     { title: 'Volunteers',          hint: 'Volunteers holding a defined role in an organization' },
  },
  community: {
    title:      'Community',
    hint:       'Every active user without a role. Identities are masked — only the count is shown.',
    masked:     (n: number) => `${n} community members`,
    affiliated: (n: number) => `${n} affiliated volunteers (self-declared)`,
  },
  stats: {
    community:   'Community',
    roleHolders: 'Role holders',
    orgs:        'Organizations',
    affiliated:  'Affiliated volunteers',
  },
  emptyTier:   'No role holders in this layer.',
  showMore:    (n: number) => `+${n} more`,
  showLess:    'Show less',
  verified:    'Verified organization',
  moreRoles:   (n: number) => `+${n}`,
  loadError:   'Failed to load the hierarchy.',
  retry:       'Try again',
  personA11y:  (name: string, role: string, org: string) => `${name}, ${role}, ${org}`,
  headcountA11y: (n: number) => `${n} people in this layer`,
} as const;
