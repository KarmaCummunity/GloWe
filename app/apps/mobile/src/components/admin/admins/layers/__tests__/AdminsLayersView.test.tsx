// @vitest-environment jsdom
// FR-ADMIN-028 — layered hierarchy view: data/error states, org focus, a11y.
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@kc/ui';
import {
  buildHierarchyPyramid,
  type HierarchySnapshot,
  type OrgTreeMember,
} from '@kc/domain';

// The hook is replaced by an in-memory fold of a fixed snapshot so each test
// controls the loaded data and the error independently.
const state: { snapshot: HierarchySnapshot | null; error: unknown } = { snapshot: null, error: null };

vi.mock('../../../../../hooks/useHierarchyPyramid', () => ({
  useHierarchyPyramid: (focusOrgId: string | null) => ({
    pyramid: state.snapshot ? buildHierarchyPyramid(state.snapshot, focusOrgId) : null,
    isRefetching: false,
    refetch: vi.fn(),
    error: state.error,
  }),
}));
vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
// Entry animation pulls in reanimated; the layout under test does not depend on it.
vi.mock('../../../../ui/MotionEntry', () => ({
  MotionEntry: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('../../../../AvatarInitials', () => ({ AvatarInitials: () => null }));
// Pin the Hebrew bundle; both accessors of the real module serve it.
vi.mock('../../../../../i18n/useLocaleBundle', async () => {
  const he = (await import('../../../../../i18n/locales/he')).default;
  return { useLocaleBundle: () => he, localeBundle: () => he };
});

import { AdminsLayersView } from '../AdminsLayersView';
import { localeBundle } from '../../../../../i18n/useLocaleBundle';

const L = localeBundle();

const PLATFORM = 'org-platform';

function member(over: Partial<OrgTreeMember> & { grantId: string }): OrgTreeMember {
  return {
    userId: `u-${over.grantId}`,
    displayName: over.grantId,
    avatarUrl: null,
    role: 'org_admin',
    scopeOrgId: 'org-a',
    orgId: 'org-a',
    orgName: 'Alpha',
    isPlatform: false,
    managerGrantId: null,
    lastSeenAt: null,
    ...over,
  };
}

const SNAPSHOT: HierarchySnapshot = {
  members: [
    member({ grantId: 'root', role: 'super_admin', scopeOrgId: null, orgId: PLATFORM, orgName: 'Karma', isPlatform: true }),
    member({ grantId: 'alice' }),
    member({ grantId: 'bob', orgId: 'org-b', scopeOrgId: 'org-b', orgName: 'Beta' }),
    member({ grantId: 'multi', userId: 'u-multi', role: 'org_employee' }),
    member({ grantId: 'multi-2', userId: 'u-multi', displayName: 'multi', role: 'volunteer_manager' }),
  ],
  census: {
    communityTotal: 50,
    roleHolderTotal: 5,
    orgs: [
      { orgId: PLATFORM, name: 'Karma', isPlatform: true, isVerified: true, affiliatedCount: 0 },
      { orgId: 'org-a', name: 'Alpha', isPlatform: false, isVerified: true, affiliatedCount: 3 },
      { orgId: 'org-b', name: 'Beta', isPlatform: false, isVerified: false, affiliatedCount: 0 },
    ],
  },
};

const renderView = () =>
  render(
    <ThemeProvider mode="light" systemScheme="light" setMode={() => {}}>
      <AdminsLayersView isWide={false} onSelect={() => {}} />
    </ThemeProvider>,
  );

afterEach(() => {
  cleanup();
  state.snapshot = null;
  state.error = null;
});

describe('AdminsLayersView', () => {
  it('keeps showing loaded strata when a background refetch fails', () => {
    state.snapshot = SNAPSHOT;
    state.error = new Error('network');
    renderView();
    expect(screen.getByText('alice')).toBeTruthy();
    expect(screen.queryByText(L.admin.admins.layers.loadError)).toBeNull();
  });

  it('shows the load error with a retry action when nothing has loaded', () => {
    state.error = new Error('forbidden');
    renderView();
    expect(screen.getByText(L.admin.admins.layers.loadError)).toBeTruthy();
    expect(screen.getByRole('button', { name: L.admin.admins.layers.retry })).toBeTruthy();
  });

  it('focusing an org chip narrows the strata to that org', () => {
    state.snapshot = SNAPSHOT;
    renderView();
    expect(screen.getByText('alice')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Beta' }));
    expect(screen.getByText('bob')).toBeTruthy();
    expect(screen.queryByText('alice')).toBeNull();
  });

  it('announces extra roles in the person chip accessibility label', () => {
    state.snapshot = SNAPSHOT;
    renderView();
    const roles = L.admin.roles;
    const label = L.admin.admins.layers.personA11y('multi', roles.volunteer_manager, 'Alpha', 1);
    expect(screen.getByRole('button', { name: label })).toBeTruthy();
  });
});
