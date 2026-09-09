// GloWe visual regression — stable chrome snapshots (INFRA-QA-W2 / FR-GLOWE-*).
// Catches layout/CSS regressions without asserting every pixel of dynamic feed data.
// Update baselines: npx playwright test --project=glowe-visual --update-snapshots
import { test, expect } from '@playwright/test';
import { GLOWE_BASE, gloweUrl } from '../lib/glowe';

const SNAPSHOT_OPTS = {
  maxDiffPixelRatio: 0.04,
  animations: 'disabled' as const,
};

// Same client state on every host. Pinning the hosted dev backend matters when
// the checkout is served on 127.0.0.1 (PR runs, local baselines): without it
// backend-config.js picks local Supabase and app.js renders the header CTA as
// "Dev sign in" (105px) instead of "Sign up / Sign in" (137px), so the masked
// box — and the snapshot — differs from the deployed site (TD-193).
function pinVisualState() {
  try {
    window.localStorage.setItem('glowe-guest-welcomed', '1');
    window.localStorage.setItem('glowe-backend', 'dev');
  } catch { /* ignore */ }
}

test.describe('GloWe visual regression — static chrome', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(pinVisualState);
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

// FR-GLOWE-029 Phase 2 — the shell (header / bottom nav / footer) is rendered
// once by js/ui/glowe-ui-shell.js and styled by css/layout-*.css. Snapshot it
// per page × viewport so active-nav state and the 768px nav swap are pinned
// without asserting live feed data.
const SHELL_PAGES = [
  { slug: 'home', path: `${GLOWE_BASE}/index.html` },
  { slug: 'wishing-well', path: gloweUrl('wishing-well.html') },
  { slug: 'community', path: gloweUrl('community.html') },
  { slug: 'organizations', path: gloweUrl('organizations.html') },
  { slug: 'my-applications', path: gloweUrl('my-applications.html') },
  { slug: 'messages', path: gloweUrl('messages.html') },
  { slug: 'settings', path: gloweUrl('settings.html') },
];
const SHELL_VIEWPORTS = [
  { label: '390', width: 390, height: 844 },
  { label: '768', width: 768, height: 1024 },
  { label: '1280', width: 1280, height: 900 },
];

test.describe('GloWe visual regression — shell per page × viewport', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(pinVisualState);
  });

  for (const vp of SHELL_VIEWPORTS) {
    for (const pg of SHELL_PAGES) {
      test(`header — ${pg.slug} @ ${vp.label}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(pg.path);
        const header = page.locator('.main-header');
        await expect(header.locator('.logo-text')).toHaveText('GloWe', { timeout: 20_000 });
        await expect(header).toHaveScreenshot(`shell-header-${pg.slug}-${vp.label}.png`, {
          ...SNAPSHOT_OPTS,
          mask: [page.locator('.auth-buttons'), page.locator('.user-menu')],
        });
      });
    }

    test(`footer — home @ ${vp.label}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      // Pre-accept the fixed-position consent banner so it never overlays the
      // footer capture.
      await page.addInitScript(() => {
        try { window.localStorage.setItem('glowe-consent-v1', 'accepted'); } catch { /* ignore */ }
      });
      await page.goto(`${GLOWE_BASE}/index.html`);
      const footer = page.locator('.main-footer');
      await expect(footer).toBeVisible({ timeout: 20_000 });
      // The footer's y-offset (and thus the rounded capture height) depends on
      // whatever the async feed rendered above it, and the sticky header /
      // fixed bottom nav (snapshotted separately) overlay a footer taller than
      // the viewport. Collapse all of them so the snapshot is a function of
      // the footer chrome alone.
      await page.addStyleTag({
        content: 'body > main, .main-header, .mobile-bottom-nav { display: none !important; }',
      });
      await footer.scrollIntoViewIfNeeded();
      await expect(footer).toHaveScreenshot(`shell-footer-home-${vp.label}.png`, {
        ...SNAPSHOT_OPTS,
        // The build stamp (vX.Y.Z) bumps on every PR — never pin it.
        mask: [footer.locator('.footer-build')],
      });
    });
  }

  test('bottom nav — home @ 390', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${GLOWE_BASE}/index.html`);
    const nav = page.locator('.mobile-bottom-nav');
    await expect(nav).toBeVisible({ timeout: 20_000 });
    await expect(nav).toHaveScreenshot('shell-bottom-nav-home-390.png', SNAPSHOT_OPTS);
  });

  test('bottom nav — hidden at 768 and up', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${GLOWE_BASE}/index.html`);
    await expect(page.locator('.main-nav')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('.mobile-bottom-nav')).toBeHidden();
  });
});
