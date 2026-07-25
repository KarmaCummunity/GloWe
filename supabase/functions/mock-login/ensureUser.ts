// Local mock-login only — ensures auth.users + glowe_profiles (+ optional admin grant).

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

export const MOCK_DEV_PASSWORD = 'GloweLocal!2026';
export const DEFAULT_MOCK_EMAIL = 'test-user@local.dev';
export const DEFAULT_MOCK_NAME = 'Local Test User';

export type MockLoginInput = {
  userId?: string;
  email?: string;
  role?: string;
  profileType?: string;
  approvalStatus?: string;
  displayName?: string;
};

export type EnsureUserResult = {
  userId: string;
  email: string;
  displayName: string;
};

function normalizeRole(role?: string): 'user' | 'admin' {
  return role === 'admin' ? 'admin' : 'user';
}

async function findUserIdByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<string | null> {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;
  const users = data?.users ?? [];
  const match = users.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase());
  return match?.id ?? null;
}

async function ensureAuthUser(
  admin: SupabaseClient,
  email: string,
  displayName: string,
  preferredUserId?: string,
): Promise<string> {
  if (preferredUserId) {
    const { data, error } = await admin.auth.admin.getUserById(preferredUserId);
    if (!error && data?.user) {
      await admin.auth.admin.updateUserById(preferredUserId, {
        email,
        password: MOCK_DEV_PASSWORD,
        email_confirm: true,
        user_metadata: { name: displayName, full_name: displayName },
      });
      return preferredUserId;
    }
  }

  const existingId = await findUserIdByEmail(admin, email);
  if (existingId) {
    await admin.auth.admin.updateUserById(existingId, {
      password: MOCK_DEV_PASSWORD,
      email_confirm: true,
      user_metadata: { name: displayName, full_name: displayName },
    });
    return existingId;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: MOCK_DEV_PASSWORD,
    email_confirm: true,
    user_metadata: { name: displayName, full_name: displayName },
    ...(preferredUserId ? { user_metadata: { name: displayName, full_name: displayName } } : {}),
  });
  if (error || !data.user) throw error ?? new Error('create_user_failed');
  return data.user.id;
}

async function ensurePublicUserRow(
  admin: SupabaseClient,
  userId: string,
  displayName: string,
): Promise<void> {
  await admin.from('users').upsert({
    user_id: userId,
    display_name: displayName,
    account_status: 'active',
  }, { onConflict: 'user_id' });
}

function normalizeProfileType(value?: string): 'individual' | 'organization' {
  return value === 'organization' ? 'organization' : 'individual';
}

function normalizeApprovalStatus(
  accountType: 'individual' | 'organization',
  value?: string,
): 'approved' | 'pending' | 'not_required' {
  if (value === 'approved' || value === 'pending' || value === 'not_required') {
    return value;
  }
  return accountType === 'organization' ? 'pending' : 'not_required';
}

async function ensureGloweProfile(
  admin: SupabaseClient,
  userId: string,
  email: string,
  displayName: string,
  input: Pick<MockLoginInput, 'profileType' | 'approvalStatus'> = {},
): Promise<void> {
  const accountType = normalizeProfileType(input.profileType);
  const approvalStatus = normalizeApprovalStatus(accountType, input.approvalStatus);
  const row: Record<string, unknown> = {
    id: userId,
    email,
    display_name: displayName,
    profile_type: accountType === 'organization' ? 'Organization' : 'Individual',
    account_type: accountType,
    approval_status: approvalStatus,
    onboarding_complete: true,
    profile_status: approvalStatus === 'pending' ? 'Pending review' : 'Approved',
    country: 'Exampleland',
    about: 'Local mock-login test user.',
  };

  if (accountType === 'organization') {
    Object.assign(row, {
      org_name: displayName,
      focus: 'Community',
      org_field: 'Community',
      org_description: row.about,
      org_contact_email: email,
      org_contact_name: displayName,
      org_country: 'Exampleland',
      org_submitted_at: new Date().toISOString(),
      org_reviewed_at: approvalStatus === 'approved' ? new Date().toISOString() : null,
    });
  }

  await admin.from('glowe_profiles').upsert(row, { onConflict: 'id' });
}

async function ensureAdminGrant(admin: SupabaseClient, userId: string): Promise<void> {
  const { data: existing } = await admin
    .from('admin_role_grants')
    .select('grant_id')
    .eq('user_id', userId)
    .eq('role', 'glowe_admin')
    .is('revoked_at', null)
    .maybeSingle();
  if (existing) return;
  await admin.from('admin_role_grants').insert({
    user_id: userId,
    role: 'glowe_admin',
    granted_by: userId,
  });
}

export async function ensureMockUser(
  admin: SupabaseClient,
  input: MockLoginInput,
): Promise<EnsureUserResult> {
  const email = (input.email ?? DEFAULT_MOCK_EMAIL).trim().toLowerCase();
  const displayName = (input.displayName ?? '').trim()
    || (email === DEFAULT_MOCK_EMAIL ? DEFAULT_MOCK_NAME : email.split('@')[0]);
  const userId = await ensureAuthUser(admin, email, displayName, input.userId);
  await ensurePublicUserRow(admin, userId, displayName);
  await ensureGloweProfile(admin, userId, email, displayName, input);
  if (normalizeRole(input.role) === 'admin') {
    await ensureAdminGrant(admin, userId);
  }
  return { userId, email, displayName };
}
