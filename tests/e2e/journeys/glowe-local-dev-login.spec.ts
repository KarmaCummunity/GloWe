// Browser smoke test — local dev sign-in via mock-login persona click.
import { test, expect } from '@playwright/test';

const GLOWE_URL = process.env.GLOWE_URL || 'http://localhost:4321';

test.describe('local dev sign-in', () => {
  test('Alex persona logs in without Google OAuth', async ({ page }) => {
    await page.goto(GLOWE_URL, { waitUntil: 'domcontentloaded' });

    const diag = await page.evaluate(() => ({
      supabaseUrl: window.GLOWE_BACKEND_CONFIG?.supabaseUrl,
      devActive: Boolean(window.GloweDevAuth?.isActive()),
      localConfigured: Boolean(window.GloweDevAuth?.isLocalSupabaseConfigured()),
      host: location.hostname,
      port: location.port,
    }));
    expect(diag.supabaseUrl).toContain('127.0.0.1:54321');
    expect(diag.devActive).toBe(true);

    const guestContinue = page.getByRole('button', { name: /^Continue$/i });
    if (await guestContinue.isVisible().catch(() => false)) {
      await guestContinue.click();
    }

    await page.getByRole('button', { name: /dev sign in|sign up \/ sign in|log in|כניסה/i }).first().click();

    const modal = page.locator('#login-modal.active');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(modal.getByText('Local dev sign-in')).toBeVisible();

    const alexBtn = modal.locator('[data-dev-signin-email="glowe-local-alex@example.test"]');
    await expect(alexBtn).toBeVisible();

    await alexBtn.click();

    await expect(page.locator('#success-modal.active')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#success-message')).toContainText(/Alex|Welcome/i);

    const loggedIn = await page.evaluate(() => Boolean(localStorage.getItem('gloweUser')));
    expect(loggedIn).toBe(true);
  });
});
