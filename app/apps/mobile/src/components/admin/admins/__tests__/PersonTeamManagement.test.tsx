// @vitest-environment jsdom
// FR-ADMIN-030 — person screen team management: roles with authority-gated
// actions, the change-role and grant flows, and role-derived permissions.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@kc/ui';
import type { AdminGrant, AuthorityGrant } from '@kc/domain';

// vi.mock factories are hoisted above imports, so their spies must be hoisted too.
const { authority, grantMutate, changeMutate } = vi.hoisted(() => ({
  authority: {
    viewer: [] as AuthorityGrant[],
    scopes: [] as { scopeOrgId: string | null; name: string }[],
  },
  grantMutate: vi.fn(async () => 'g-new'),
  changeMutate: vi.fn(async () => 'g-changed'),
}));

vi.mock('../../../../hooks/useGrantAuthority', () => ({
  useGrantAuthority: () => ({ ...authority, isLoading: false }),
}));
vi.mock('../../../../hooks/useHierarchyPyramid', () => ({
  useHierarchyPyramid: () => ({
    pyramid: {
      orgs: [
        { orgId: 'org-p', name: 'Karma', isPlatform: true },
        { orgId: 'org-a', name: 'Alpha', isPlatform: false },
      ],
    },
  }),
}));
vi.mock('../../../../hooks/useAdminRoleMutations', () => ({
  useGrantAdminRole: () => ({ mutateAsync: grantMutate, isPending: false }),
  useChangeAdminRole: () => ({ mutateAsync: changeMutate, isPending: false }),
  useRevokeAdminRole: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('../../../../lib/container', () => ({ supabase: {} }));
vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
// Pin the Hebrew bundle; both accessors of the real module serve it.
vi.mock('../../../../i18n/useLocaleBundle', async () => {
  const he = (await import('../../../../i18n/locales/he')).default;
  return { useLocaleBundle: () => he, localeBundle: () => he };
});

import { PersonRolesSection } from '../PersonRolesSection';
import { RolePermissionsSection } from '../RolePermissionsSection';
import { localeBundle } from '../../../../i18n/useLocaleBundle';

const L = localeBundle();
const team = L.admin.admins.team;

function grant(over: Partial<AdminGrant> & Pick<AdminGrant, 'grantId' | 'role'>): AdminGrant {
  return {
    userId: 'u-person',
    displayName: 'Dana',
    avatarUrl: null,
    scopeOrgId: 'org-a',
    grantedAt: new Date('2026-01-01T00:00:00Z'),
    grantedBy: null,
    grantedByDisplayName: null,
    revokedAt: null,
    revokedBy: null,
    lastSeenAt: null,
    ...over,
  };
}

const withTheme = (node: React.ReactNode) => (
  <ThemeProvider mode="light" systemScheme="light" setMode={() => {}}>{node}</ThemeProvider>
);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  authority.viewer = [];
  authority.scopes = [];
});

describe('PersonRolesSection', () => {
  it('offers change and revoke only on grants within the viewer\'s authority', () => {
    authority.viewer = [{ role: 'org_admin', scopeOrgId: 'org-a' }];
    authority.scopes = [{ scopeOrgId: 'org-a', name: 'Alpha' }];
    render(withTheme(
      <PersonRolesSection
        userId="u-person"
        personName="Dana"
        grants={[grant({ grantId: 'g1', role: 'org_volunteer' }), grant({ grantId: 'g2', role: 'org_admin' })]}
      />,
    ));
    expect(screen.getAllByText('Alpha')).toHaveLength(2);
    // Only the volunteer grant is below the viewer's org_admin authority.
    expect(screen.getAllByRole('button', { name: team.changeRole })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: L.admin.admins.row.revokeShort })).toHaveLength(1);
    expect(screen.getByRole('button', { name: team.addRole })).toBeTruthy();
  });

  it('hides every action for a viewer without grant authority', () => {
    authority.viewer = [{ role: 'moderator', scopeOrgId: null }];
    render(withTheme(
      <PersonRolesSection userId="u-person" personName="Dana" grants={[grant({ grantId: 'g1', role: 'org_volunteer' })]} />,
    ));
    expect(screen.queryByRole('button', { name: team.changeRole })).toBeNull();
    expect(screen.queryByRole('button', { name: team.addRole })).toBeNull();
  });

  it('changes a role in place to one the viewer may grant', async () => {
    authority.viewer = [{ role: 'volunteer_manager', scopeOrgId: 'org-a' }];
    authority.scopes = [{ scopeOrgId: 'org-a', name: 'Alpha' }];
    render(withTheme(
      <PersonRolesSection userId="u-person" personName="Dana" grants={[grant({ grantId: 'g1', role: 'org_volunteer' })]} />,
    ));
    fireEvent.click(screen.getByRole('button', { name: team.changeRole }));
    // A volunteer manager may only move a volunteer up to volunteer manager.
    fireEvent.click(screen.getByRole('button', { name: L.admin.roles.volunteer_manager }));
    fireEvent.click(screen.getByRole('button', { name: team.changeModal.submit }));
    await vi.waitFor(() => expect(changeMutate).toHaveBeenCalledWith({ grantId: 'g1', newRole: 'volunteer_manager' }));
  });

  it('grants a new role to the person in the only org the viewer manages', async () => {
    authority.viewer = [{ role: 'org_admin', scopeOrgId: 'org-a' }];
    authority.scopes = [{ scopeOrgId: 'org-a', name: 'Alpha' }];
    render(withTheme(<PersonRolesSection userId="u-person" personName="Dana" grants={[]} />));
    expect(screen.getByText(team.rolesNone)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: team.addRole }));
    fireEvent.click(screen.getByRole('button', { name: L.admin.roles.org_manager }));
    fireEvent.click(screen.getByRole('button', { name: L.admin.admins.grantModal.submit }));
    await vi.waitFor(() => expect(grantMutate).toHaveBeenCalledWith({
      targetUserId: 'u-person', role: 'org_manager', scopeOrgId: 'org-a',
    }));
  });
});

describe('RolePermissionsSection', () => {
  it('lists the permissions each role carries', () => {
    render(withTheme(<RolePermissionsSection roles={['org_manager']} />));
    expect(screen.getByText(L.admin.admins.permissions['admins.grant_role'])).toBeTruthy();
    expect(screen.queryByText(L.admin.admins.permissions['reports.view'])).toBeNull();
  });

  it('marks a role with no portal permissions', () => {
    render(withTheme(<RolePermissionsSection roles={['org_volunteer']} />));
    expect(screen.getByText(team.permissions.none)).toBeTruthy();
  });
});
