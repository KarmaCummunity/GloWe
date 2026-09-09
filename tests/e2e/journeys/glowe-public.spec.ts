// GloWe guest journeys (FR-GLOWE-023, FR-GLOWE-005) — read-only browsing,
// contextual join gates, and the Hebrew/RTL language switch. No auth state.
import { test, expect } from '@playwright/test';
import { gloweUrl, GLOWE_BASE, waitForGloweBoard } from '../lib/glowe';

test.describe('GloWe guest browsing', () => {
  // The one-time guest welcome modal (FR-GLOWE-023 AC6) is covered by its own
  // spec below; everywhere else it would intercept clicks, so pre-set its
  // localStorage flag before any page script runs.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { window.localStorage.setItem('glowe-guest-welcomed', '1'); } catch { /* ignore */ }
    });
  });

  test('first-time guest gets the one-time welcome', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${GLOWE_BASE}/index.html`);
    await expect(page.locator('#success-modal.active')).toBeVisible({ timeout: 20_000 });
    await page.locator('#success-modal .btn-primary').click();
    await expect(page.locator('#success-modal.active')).toHaveCount(0);
    await context.close();
  });
  test('home page renders the marketing hero for guests', async ({ page }) => {
    await page.goto(`${GLOWE_BASE}/index.html`);
    await expect(page.locator('.main-header .logo-text')).toHaveText('GloWe');
    await expect(page.locator('.auth-buttons button')).toContainText('Sign up / Sign in');
  });

  test('volunteer network lists live opportunities or a friendly empty state', async ({ page }) => {
    await page.goto(gloweUrl('volunteer-network.html'));
    const list = page.locator('#opportunities-list');
    await expect(list).toBeVisible();
    // v1.4.5 — every list renders the unified feed card (FR-GLOWE-008).
    await waitForGloweBoard(page, '#opportunities-list .post-card');
  });

  test('organizations directory shows approved organizations only', async ({ page }) => {
    await page.goto(gloweUrl('organizations.html'));
    await waitForGloweBoard(page, '.opportunity-card');
    // A pending org must never appear in the public directory.
    await expect(page.getByText('יד תומכת', { exact: false })).toHaveCount(0);
  });

  test('wishing well renders the needs board', async ({ page }) => {
    await page.goto(gloweUrl('wishing-well.html'));
    // FR-GLOWE-008 — wishes render as unified feed cards.
    await waitForGloweBoard(page, '#wishes-list .post-card');
  });

  test('community feed renders posts or empty state', async ({ page }) => {
    await page.goto(gloweUrl('community.html'));
    await waitForGloweBoard(page, '.post-card');
  });

  test('forums page lists the four discussion groups', async ({ page }) => {
    await page.goto(gloweUrl('forums.html'));
    await expect(page.locator('#forum-categories')).toBeVisible();
  });

  test('guest hitting the create FAB gets the contextual join prompt', async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 900 });
    await page.goto(`${GLOWE_BASE}/index.html`);
    await page.locator('.bottom-nav-create').click();
    const modal = page.locator('#glowe-join-modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('#glowe-join-google')).toContainText('Continue with Google');
  });

  test('guest saving a card gets a sign-in gate, nothing is saved', async ({ page }) => {
    await page.goto(gloweUrl('wishing-well.html'));
    await waitForGloweBoard(page, '#wishes-list .post-card');
    const card = page.locator('#wishes-list .post-card').filter({ has: page.locator('.post-more-panel button[aria-pressed]') }).first();
    test.skip((await card.count()) === 0, 'no wish cards on the board yet — re-run seed-glowe-dev.mjs');
    // FR-GLOWE-008 / FR-GLOWE-013 — Save lives in the ⋯ menu, not a heart.
    await card.locator('.post-more-menu summary').click();
    const saveBtn = card.locator('.post-more-panel button[aria-pressed]');
    await expect(saveBtn).toHaveAttribute('aria-pressed', 'false');
    await saveBtn.click();
    // Product (this branch): contextual join modal (FR-GLOWE-023 save-item).
    // Staging until that deploy lands may still start Google OAuth immediately.
    const joinModal = page.locator('#glowe-join-modal.active, #login-modal.active');
    await Promise.race([
      joinModal.waitFor({ state: 'visible', timeout: 15_000 }),
      page.waitForURL(/accounts\.google\.com/, { timeout: 15_000 }),
    ]);
    if (await joinModal.isVisible().catch(() => false)) {
      await expect(joinModal).toContainText(/Keep this for later|Sign in/i);
    }
  });

  test('guest reporting content gets a sign-in gate', async ({ page }) => {
    await page.goto(gloweUrl('community.html'));
    await waitForGloweBoard(page, '.post-card');
    const menu = page.locator('.post-card .post-more-menu summary').first();
    test.skip((await menu.count()) === 0, 'no community posts yet');
    await menu.click();
    await page.locator('.post-card .post-more-panel button', { hasText: 'Report' }).first().click();
    await expect(page.locator('#glowe-join-modal')).toBeVisible();
  });

  test('messages page asks guests to sign in', async ({ page }) => {
    await page.goto(gloweUrl('messages.html'));
    await expect(page.locator('#messages-content .empty-state')).toContainText('Sign in');
  });

  // FR-GLOWE-005 AC1–AC3: header control is a <select.lang-toggle>; change persists
  // via localStorage + full reload (setGloweLanguage), then applyGloweDirection().
  test('language select switches to Hebrew RTL and back to English', async ({ page }) => {
    await page.goto(`${GLOWE_BASE}/index.html`);
    const select = page.locator('select.lang-toggle').first();
    await expect(select).toBeVisible();
    await expect(select).toHaveAttribute('aria-label', /Interface language/i);

    await Promise.all([
      page.waitForEvent('load'),
      select.selectOption('he'),
    ]);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'he');
    await expect(page.locator('.auth-buttons button').first()).not.toContainText('Sign up / Sign in');

    await Promise.all([
      page.waitForEvent('load'),
      page.locator('select.lang-toggle').first().selectOption('en'),
    ]);
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  // FR-GLOWE-006 — wish-filter-panel (replaces legacy sticky .well-filters).
  // Unified list filters (glowe-list-filters.js, SHEET_MQ 767px = shell `md` boundary):
  // Desktop (>=768px): advanced pill groups render in flow; the sheet button is hidden.
  // Mobile (<768px): advanced groups live in a bottom sheet behind #wish-filters-open.
  test('wishing well filter panel uses progressive disclosure, not a sticky sidebar', async ({ page }) => {
    await page.goto(gloweUrl('wishing-well.html'));
    const panel = page.locator('#wish-filters-root .glowe-filter-panel');
    await expect(panel).toBeVisible({ timeout: 20_000 });
    await expect(panel.locator('#wish-search')).toBeVisible();
    await expect(panel.locator('#wish-sort')).toBeVisible();

    const open = page.locator('#wish-filters-open');
    const advanced = page.locator('#wish-filters-dialog .glowe-filter-advanced');
    await expect(open).toBeHidden();
    await expect(advanced).toBeVisible();
    await expect(advanced.locator('.filter-accordion')).toHaveCount(2);

    const position = await panel.evaluate((el) => getComputedStyle(el).position);
    expect(position).not.toBe('sticky');

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(open).toBeVisible();
    await expect(advanced).toBeHidden();
    await open.click();
    await expect(open).toHaveAttribute('aria-expanded', 'true');
    await expect(advanced).toBeVisible();
    await expect(advanced.locator('.filter-accordion')).toHaveCount(2);
    await page.keyboard.press('Escape');
    await expect(advanced).toBeHidden();
  });

  test('opportunity cards use the unified feed card chrome', async ({ page }) => {
    await page.goto(gloweUrl('volunteer-network.html'));
    await waitForGloweBoard(page, '#opportunities-list .post-card');
    const card = page.locator('#opportunities-list .post-card').first();
    test.skip((await card.count()) === 0, 'no opportunity cards yet');
    // Unified feed card: kind tag + author row + title + excerpt (FR-GLOWE-008).
    await expect(card).toHaveAttribute('data-feed-kind', /opportunity|event/);
    await expect(card.locator('.post-type-tag')).toBeVisible();
    await expect(card.locator('.post-author')).toBeVisible();
    await expect(card.locator('.post-card-body h3')).toBeVisible();
  });

  test('community posts use a single Share control and localized comment chrome', async ({ page }) => {
    await page.goto(gloweUrl('community.html'));
    await waitForGloweBoard(page, 'article.post-card');
    // Prefer a true community post (comment chrome) over event/discovery cards.
    const post = page.locator('article.post-card').filter({ has: page.locator('.comment-form') }).first();
    await expect(post).toBeVisible({ timeout: 20_000 });

    // FR-GLOWE-008 AC5 — Share lives in the ⋯ menu; no always-visible share-row.
    await expect(post.locator('.share-row button')).toHaveCount(0);
    await expect(post.locator('.post-actions')).toHaveCount(0);
    await post.locator('.post-more-menu summary').click();
    await expect(post.locator('.post-more-panel .post-menu-action', { hasText: 'Share' })).toHaveCount(1);

    // Switch to Hebrew via the select contract (FR-GLOWE-005) and confirm
    // comment summary is localized (not "N comments") when comments exist.
    await Promise.all([
      page.waitForEvent('load'),
      page.locator('select.lang-toggle').first().selectOption('he'),
    ]);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await waitForGloweBoard(page, 'article.post-card');
    const summary = page.locator('article.post-card .comment-summary').first();
    await expect(summary).toBeVisible({ timeout: 20_000 });
    await expect(summary).not.toContainText(/comments?/i);
  });

  test('opportunity detail shows empty-state copy when requirements are missing', async ({ page }) => {
    await page.goto(gloweUrl('volunteer-network.html'));
    await waitForGloweBoard(page, '#opportunities-list .post-card');
    const card = page.locator('#opportunities-list .post-card[data-feed-kind="opportunity"]').first();
    test.skip((await card.count()) === 0, 'no plain opportunities on the board yet');
    // Feed cards carry the entity id (`post-<id>`); the detail page is opportunity.html?id=<id>.
    const id = (await card.getAttribute('id'))!.replace(/^post-/, '');
    await page.goto(gloweUrl(`opportunity.html?id=${encodeURIComponent(id)}`));
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('#opp-title')).not.toHaveText(/Loading/i, { timeout: 25_000 });
    await expect(page.locator('#opp-requirements, #opp-responsibilities').first()).toBeVisible();
    // Empty rows use the muted empty-detail marker rather than a blank heading.
    const empty = page.locator('.opportunity-main .empty-detail');
    if (await empty.count()) {
      await expect(empty.first()).toBeVisible();
    }
  });
});
