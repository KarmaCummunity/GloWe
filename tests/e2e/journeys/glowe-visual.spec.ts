// GloWe visual regression — stable chrome snapshots (INFRA-QA-W2 / FR-GLOWE-*).
// Catches layout/CSS regressions without asserting every pixel of dynamic feed data.
// Update baselines: npx playwright test --project=glowe-visual --update-snapshots
import { test, expect } from '@playwright/test';
import { GLOWE_BASE, gloweUrl } from '../lib/glowe';

const SNAPSHOT_OPTS = {
  maxDiffPixelRatio: 0.04,
  animations: 'disabled' as const,
};

test.describe('GloWe visual regression — static chrome', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { window.localStorage.setItem('glowe-guest-welcomed', '1'); } catch { /* ignore */ }
    });
  });

  test('home hero — marketing shell', async ({ page }) => {
    await page.goto(`${GLOWE_BASE}/index.html`);
    await expect(page.locator('.main-header .logo-text')).toHaveText('GloWe', { timeout: 20_000 });
    const hero = page.locator('.hero-section, .home-hero, main .hero').first();
    await expect(hero).toBeVisible();
    await expect(hero).toHaveScreenshot('home-hero.png', SNAPSHOT_OPTS);
  });

  test('forums — category catalog layout', async ({ page }) => {
    await page.goto(gloweUrl('forums.html'));
    await expect(page.locator('#forum-categories')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#forum-categories')).toHaveScreenshot('forums-categories.png', SNAPSHOT_OPTS);
  });

  test('messages — guest empty state', async ({ page }) => {
    await page.goto(gloweUrl('messages.html'));
    const empty = page.locator('#messages-content .empty-state');
    await expect(empty).toBeVisible({ timeout: 20_000 });
    await expect(empty).toHaveScreenshot('messages-guest-empty.png', SNAPSHOT_OPTS);
  });

  test('wishing well — filter accordion chrome', async ({ page }) => {
    await page.goto(gloweUrl('wishing-well.html'));
    // Unified list filters (v1.4.1) render into #wish-filters-root.
    const filters = page.locator('#wish-filters-root, .well-filters, .wish-filter-panel').first();
    await expect(filters).toBeVisible({ timeout: 20_000 });
    await expect(filters).toHaveScreenshot('wishing-well-filters.png', SNAPSHOT_OPTS);
  });

  test('header — mobile viewport chrome', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${GLOWE_BASE}/index.html`);
    const header = page.locator('.main-header');
    await expect(header).toBeVisible({ timeout: 20_000 });
    await expect(header).toHaveScreenshot('mobile-header.png', {
      ...SNAPSHOT_OPTS,
      mask: [page.locator('.auth-buttons')],
    });
  });

  test('language toggle — Hebrew RTL header', async ({ page }) => {
    await page.addInitScript(() => {
      try { window.localStorage.setItem('gloweLang', 'he'); } catch { /* ignore */ }
    });
    await page.goto(`${GLOWE_BASE}/index.html`);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl', { timeout: 20_000 });
    await expect(page.locator('.main-header')).toHaveScreenshot('header-he-rtl.png', {
      ...SNAPSHOT_OPTS,
      mask: [page.locator('.auth-buttons')],
    });
  });
});
