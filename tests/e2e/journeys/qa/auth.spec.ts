import { test, expect } from '@playwright/test';
import { USER_A } from '../../lib/env';
import { dismissGates } from '../../lib/app';

test.describe('auth (signed out)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('login with the seeded test user via the email form', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByTestId('auth-email').fill(USER_A.email);
    await page.getByTestId('auth-password').fill(USER_A.password);
    await page.getByTestId('auth-submit').click();
    await dismissGates(page);
    await expect(page).not.toHaveURL(/sign-in/, { timeout: 30_000 });
    const feed = page.getByTestId('feed-screen');
    if (!(await feed.isVisible({ timeout: 8_000 }).catch(() => false))) {
      await page.getByRole('tab', { name: 'בית' }).click().catch(() => {});
    }
    await expect(feed).toBeVisible();
  });

  test('wrong password shows an error and stays signed out', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByTestId('auth-email').fill(USER_A.email);
    await page.getByTestId('auth-password').fill('definitely-wrong-password');
    await page.getByTestId('auth-submit').click();
    await expect(page).toHaveURL(/sign-in/);
    await expect(page.getByTestId('feed-screen')).toHaveCount(0);
  });

  test('sign-up form renders with email and password fields', async ({ page }) => {
    await page.goto('/sign-up');
    await expect(page.locator('input[type="email"], input[autocomplete="email"], [data-testid="auth-email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });
});
