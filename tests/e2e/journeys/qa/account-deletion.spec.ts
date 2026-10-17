import { test, expect } from '@playwright/test';
import { SUPABASE_URL, anonKey, USER_A } from '../../lib/env';
import { dismissGates } from '../../lib/app';

/**
 * Apple 5.1.1(v): in-app account deletion, end to end on dev.
 * DESTRUCTIVE: permanently deletes the account it signs in with, so it only runs
 * when E2E_DELETE_ACCOUNT_EMAIL is set (e.g. a spare kc-dev seed user such as
 * user199@seed.kc.test). Password: E2E_DELETE_ACCOUNT_PASSWORD, else the seed password.
 */
const EMAIL = process.env.E2E_DELETE_ACCOUNT_EMAIL;
const PASSWORD = process.env.E2E_DELETE_ACCOUNT_PASSWORD ?? USER_A.password;

test.describe('account deletion (opt-in, destructive)', () => {
  test.skip(!EMAIL, 'set E2E_DELETE_ACCOUNT_EMAIL to run');
  test.skip(EMAIL === USER_A.email || /^user2@/.test(EMAIL ?? ''), 'never delete the suite users');
  test.use({ storageState: { cookies: [], origins: [] } });

  test('user deletes their account from Settings and can no longer sign in', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByTestId('auth-email').fill(EMAIL!);
    await page.getByTestId('auth-password').fill(PASSWORD);
    await page.getByTestId('auth-submit').click();
    await dismissGates(page);
    await expect(page).not.toHaveURL(/sign-in/, { timeout: 30_000 });

    await page.goto('/settings');
    await page.getByText('מחק חשבון', { exact: true }).click();
    await expect(page.getByText('מחיקת חשבון לצמיתות')).toBeVisible();
    await page.getByPlaceholder('מחק').fill('מחק');
    await page.getByText('מחק את החשבון לצמיתות', { exact: true }).click();
    await expect(page.getByText('חשבונך נמחק')).toBeVisible({ timeout: 30_000 });

    const key = await anonKey();
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    expect(res.status).toBe(400); // invalid credentials: the auth user is gone
  });
});
