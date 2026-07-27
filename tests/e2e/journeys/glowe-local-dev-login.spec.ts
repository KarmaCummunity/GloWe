// Local-only smoke: mock-login personas against local Supabase (:54321).
// Project: `glowe-local` — excluded from the hosted `glowe` CI suite.
// Run: GLOWE_WEB_URL=http://127.0.0.1:4321 npx playwright test --project=glowe-local
import { test, expect } from '@playwright/test';

const GLOWE_URL = (
  process.env.GLOWE_WEB_URL
  ?? process.env.GLOWE_URL
  ?? 'http://127.0.0.1:4321'
).replace(/\/$/, '');

const isLocalHost = /^(https?:\/\/)?(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/i.test(GLOWE_URL);

test.describe('local dev sign-in', () => {
  test.beforeAll(() => {
    test.skip(
      !isLocalHost,
      `glowe-local requires a localhost GloWe URL (got ${GLOWE_URL})`,
    );
  });

  test('Alex persona logs in without Google OAuth', async ({ page }) => {
    await page.goto(GLOWE_URL, { waitUntil: 'domcontentloaded' });

    const diag = await page.evaluate(() => ({
      supabaseUrl: (window as unknown as { GLOWE_BACKEND_CONFIG?: { supabaseUrl?: string } }).GLOWE_BACKEND_CONFIG?.supabaseUrl,
      devActive: Boolean((window as unknown as { GloweDevAuth?: { isActive?: () => boolean } }).GloweDevAuth?.isActive?.()),
      host: location.hostname,
      port: location.port,
    }));
    expect(diag.supabaseUrl, 'must target local Supabase, not hosted').toContain('127.0.0.1:54321');
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

    await expect(page.locator('#success-modal.active')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#success-message')).toContainText(/Alex|Welcome/i);

    const loggedIn = await page.evaluate(() => Boolean(localStorage.getItem('gloweUser')));
    expect(loggedIn).toBe(true);
  });
});
