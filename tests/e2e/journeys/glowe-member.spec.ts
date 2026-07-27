// GloWe signed-in member journeys (individual persona) — adaptive home +
// create menu (FR-GLOWE-016), saved toggles (FR-GLOWE-013), messaging
// (FR-GLOWE-016 AC6) and reporting (FR-GLOWE-015). Uses the seeded persona
// מיכל רוזן; all specs skip when the dev seed has not run.
import { test, expect } from '@playwright/test';
import { gloweUrl, GLOWE_BASE, skipUnlessSeeded, stateFile, waitForGloweBoard } from '../lib/glowe';

test.beforeEach(() => {
  skipUnlessSeeded(test);
});

test.use({ storageState: stateFile('michal') });

test.describe('GloWe member (individual)', () => {
  test('home shows the adaptive member view', async ({ page }) => {
    await page.goto(`${GLOWE_BASE}/index.html`);
    await expect(page.locator('#member-home')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('.user-menu')).toBeVisible();
  });

  test('create menu offers the individual set: post, need, offer', async ({ page }) => {
    await page.goto(`${GLOWE_BASE}/index.html`);
    await expect(page.locator('.user-menu')).toBeVisible({ timeout: 20_000 });
    await page.locator('.header-create-btn').click();
    const options = page.locator('#glowe-create-options .create-menu-option');
    await expect(options).toHaveCount(3);
    await expect(options.nth(0)).toContainText('Post');
    await expect(options.nth(1)).toContainText('Need');
    await expect(options.nth(2)).toContainText('Volunteer Offer');
  });

  test('need option opens the wish composer with tailored required fields', async ({ page }) => {
    await page.goto(`${GLOWE_BASE}/index.html`);
    await expect(page.locator('.user-menu')).toBeVisible({ timeout: 20_000 });
    await page.locator('.header-create-btn').click();
    await page.locator('#glowe-create-options .create-menu-option', { hasText: 'Need' }).click();
    await expect(page.locator('#wish-modal')).toBeVisible();
    await expect(page.locator('#wish-title')).toBeVisible();
  });

  test('saved toggle saves and unsaves a wish card in place', async ({ page }) => {
    await page.goto(gloweUrl('wishing-well.html'));
    await waitForGloweBoard(page, '#wishes-list .opportunity-card');
    const card = page.locator('#wishes-list .opportunity-card').first();
    test.skip((await card.count()) === 0, 'no wish cards on the board yet — re-run seed-glowe-dev.mjs');

    async function openSaveToggle() {
      const menu = card.locator('details.post-more-menu');
      const panel = menu.locator('.post-more-panel');
      if (!(await panel.isVisible().catch(() => false))) {
        await menu.locator('summary').click();
      }
      const btn = panel.locator('button[aria-pressed]');
      await expect(btn).toBeVisible();
      return btn;
    }

    const saveBtn = await openSaveToggle();
    const initiallySaved = (await saveBtn.getAttribute('aria-pressed')) === 'true';
    await saveBtn.click();
    // Toast / success chrome may close the ⋯ menu — reopen before asserting.
    const afterFirst = await openSaveToggle();
    await expect(afterFirst).toHaveAttribute('aria-pressed', String(!initiallySaved));
    await afterFirst.click();
    const restored = await openSaveToggle();
    await expect(restored).toHaveAttribute('aria-pressed', String(initiallySaved));
  });

  test('messages inbox lists the seeded conversation and opens the thread', async ({ page }) => {
    await page.goto(gloweUrl('messages.html'));
    await expect(page.locator('.user-menu')).toBeVisible({ timeout: 20_000 });
    await waitForGloweBoard(page, '.chat-inbox-row');
    // Seed fixture: מיכל ↔ לב פתוח — inbox may show localized / lowercased English.
    const row = page.locator('.chat-inbox-row').filter({ hasText: /לב פתוח|open heart/i }).first();
    test.skip((await row.count()) === 0, 'seeded chat with לב פתוח missing — re-run seed-glowe-dev.mjs');
    await expect(row).toBeVisible({ timeout: 25_000 });
    await row.click();
    await expect(page.locator('.chat-thread')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('.chat-bubble').first()).toBeVisible();
  });

  test('sending a chat message appends it to the thread', async ({ page }) => {
    await page.goto(gloweUrl('messages.html'));
    await expect(page.locator('.user-menu')).toBeVisible({ timeout: 20_000 });
    await waitForGloweBoard(page, '.chat-inbox-row');
    const row = page.locator('.chat-inbox-row').filter({ hasText: /לב פתוח|open heart/i }).first();
    test.skip((await row.count()) === 0, 'seeded chat with לב פתוח missing — re-run seed-glowe-dev.mjs');
    await expect(row).toBeVisible({ timeout: 25_000 });
    await row.click();
    await expect(page.locator('.chat-send-form input')).toBeVisible({ timeout: 20_000 });
    const stamp = `e2e-${Date.now().toString(36)}`;
    await page.locator('.chat-send-form input').fill(`בדיקת E2E ${stamp}`);
    await page.locator('.chat-send-form button[type="submit"]').click();
    await expect(page.locator('.chat-bubble.mine', { hasText: stamp })).toBeVisible({ timeout: 20_000 });
  });

  test('reporting a post persists (first time) or dedupes (already reported)', async ({ page }) => {
    await page.goto(gloweUrl('community.html'));
    await waitForGloweBoard(page, '.post-card');
    const card = page.locator('.post-card').first();
    test.skip((await card.count()) === 0, 'no community posts yet');
    await card.locator('.post-more-menu summary').click();
    await card.locator('.post-more-panel button', { hasText: 'Report' }).click();
    await expect(page.locator('#report-modal')).toBeVisible();
    await page.locator('#report-reason').selectOption('other');
    await page.locator('#report-details').fill('בדיקת E2E — אפשר לדחות את הדיווח הזה.');
    await page.locator('#report-modal button[type="submit"]').click();
    await expect(page.locator('#success-modal #success-title')).toHaveText(/Report received|Already reported/, { timeout: 20_000 });
  });

  test('personal area is reachable from the greeting', async ({ page }) => {
    await page.goto(gloweUrl('my-applications.html'), { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.user-menu')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('body')).not.toContainText('Sign in to see');
  });
});