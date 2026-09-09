// GloWe live-site read-only health probes (INFRA-QA-W7 / FR-GLOWE-018).
// Target: GLOWE_PROD_URL (https://dev.karma-community.pages.dev/glowe) — no writes.
import { test, expect } from '@playwright/test';
import { fetchAppVersion, gloweUrl, GLOWE_BASE, GLOWE_PROD_URL, VERSION_RE } from '../lib/prod';

test.describe.configure({ mode: 'serial' });

test.beforeAll(() => {
  test.skip(!GLOWE_PROD_URL, 'GLOWE_PROD_URL is not set — skipping prod-health suite');
});

test.describe('GloWe production health (read-only)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { window.localStorage.setItem('glowe-guest-welcomed', '1'); } catch { /* ignore */ }
    });
  });

  test('home_load — marketing shell renders', async ({ page }) => {
    await page.goto(`${GLOWE_BASE}/index.html`);
    await expect(page.locator('.main-header .logo-text')).toHaveText('GloWe', { timeout: 25_000 });
    await expect(page.locator('.auth-buttons button').first()).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/development environment/i);
  });

  test('app_version — glowe-version.js exposes semver', async ({ page }) => {
    const version = await fetchAppVersion();
    expect(version, 'glowe-version.js semver').toMatch(/^\d+\.\d+\.\d+$/);
    const res = await page.goto(`${GLOWE_BASE}/js/glowe-version.js`);
    expect(res?.ok()).toBeTruthy();
    const body = await res!.text();
    expect(body).toMatch(VERSION_RE);
  });

  test('community_feed — posts or empty state', async ({ page }) => {
    await page.goto(gloweUrl('community.html'));
    await expect(page.locator('.post-card, .empty-state').first()).toBeVisible({ timeout: 25_000 });
  });

  test('wishing_well — needs board renders', async ({ page }) => {
    await page.goto(gloweUrl('wishing-well.html'));
    await expect(page.locator('.post-card, .wish-card, .empty-state').first()).toBeVisible({ timeout: 25_000 });
  });

  test('volunteer_network — opportunities or empty state', async ({ page }) => {
    await page.goto(gloweUrl('volunteer-network.html'));
    await expect(page.locator('#opportunities-list .post-card, #opportunities-list .opportunity-card, #opportunities-list .empty-state').first())
      .toBeVisible({ timeout: 25_000 });
  });

  test('forums — discussion groups catalog', async ({ page }) => {
    await page.goto(gloweUrl('forums.html'));
    await expect(page.locator('#forum-categories')).toBeVisible({ timeout: 25_000 });
  });

  test('organizations — approved org cards or empty state', async ({ page }) => {
    await page.goto(gloweUrl('organizations.html'));
    await expect(page.locator('.opportunity-card, .empty-state').first()).toBeVisible({ timeout: 25_000 });
  });

  test('messages_guest_gate — inbox asks guests to sign in', async ({ page }) => {
    await page.goto(gloweUrl('messages.html'));
    await expect(page.locator('#messages-content .empty-state')).toContainText(/sign in/i, { timeout: 20_000 });
  });

  test('backend_config — Supabase client initializes without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(gloweUrl('community.html'));
    await expect(page.locator('.post-card, .empty-state').first()).toBeVisible({ timeout: 25_000 });
    const fatal = errors.filter((line) => /supabase|backend|failed to fetch/i.test(line));
    expect(fatal, `console errors: ${fatal.join(' | ')}`).toHaveLength(0);
  });
});
