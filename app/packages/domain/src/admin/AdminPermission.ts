import type { AdminRole } from './AdminRole';

export const ADMIN_PERMISSIONS = [
  'portal.access',
  'reports.view',
  'reports.confirm_or_dismiss',
  'reports.restore_target',
  'reports.permanent_ban',
  'reports.manual_remove_post',
  'reports.admin_edit_post',
  'chat.delete_message',
  'tasks.view',
  'tasks.create',
  'tasks.delete_any',
  'admins.view',
  'admins.grant_role',
  'admins.revoke_role',
  'admins.set_manager',
  'users.search',
  'users.privacy_override',
  'posts.search',
  'surveys.view',
  'audit.view_own',
  'audit.view_any',
  'time.report',
  'time.approve',
  'money.manage',
  'crm.manage',
  'org.review_applications',
  'whatsapp.manage',
  'matching.view_quality',
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const PERMISSION_MATRIX: Readonly<Record<AdminPermission, readonly AdminRole[]>> = {
  'portal.access':              ['super_admin', 'moderator', 'support'],
  'reports.view':               ['super_admin', 'moderator', 'support'],
  'reports.confirm_or_dismiss': ['super_admin', 'moderator'],
  'reports.restore_target':     ['super_admin', 'moderator'],
  'reports.permanent_ban':      ['super_admin'],
  'reports.manual_remove_post': ['super_admin', 'moderator'],
  'reports.admin_edit_post':    ['super_admin', 'moderator'],
  'chat.delete_message':        ['super_admin', 'moderator'],
  'tasks.view':                 ['super_admin', 'moderator', 'support'],
  'tasks.create':               ['super_admin', 'moderator', 'support'],
  'tasks.delete_any':           ['super_admin'],
  'admins.view':                ['super_admin', 'moderator'],
  'admins.grant_role':          ['super_admin'],
  'admins.revoke_role':         ['super_admin'],
  // Convenience gate for the assign-manager UI; the RPC re-checks scoped
  // authority via can_grant_role (org_admin/org_manager only within their org).
  'admins.set_manager':         ['super_admin', 'org_admin', 'org_manager', 'volunteer_manager', 'operators_manager'],
  'users.search':               ['super_admin', 'moderator', 'support'],
  'users.privacy_override':     ['super_admin', 'moderator', 'support'],
  'posts.search':               ['super_admin', 'moderator', 'support'],
  'surveys.view':               ['super_admin', 'moderator'],
  'audit.view_own':             ['super_admin', 'moderator', 'support'],
  'audit.view_any':             ['super_admin'],
  'time.report':                ['super_admin', 'moderator', 'support'],
  'time.approve':               ['super_admin', 'moderator'],
  'money.manage':               ['super_admin', 'moderator'],
  'crm.manage':                 ['super_admin', 'moderator'],
  'org.review_applications':    ['super_admin', 'moderator'],
  'whatsapp.manage':            ['super_admin', 'moderator'],
  // KC#1122 / FR-ADMIN-028 — mirrors admin_match_quality's admin_assert_role (0461).
  'matching.view_quality':      ['super_admin', 'moderator'],
};

export function hasPermission(
  roles: readonly AdminRole[],
  permission: AdminPermission,
): boolean {
  const allowed = PERMISSION_MATRIX[permission];
  for (const r of roles) {
    if (allowed.includes(r)) return true;
  }
  return false;
}
