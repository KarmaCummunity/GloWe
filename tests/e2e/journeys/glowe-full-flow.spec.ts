// GloWe full-flow journey (FR-GLOWE-006/007/012/016) — the golden path across
// two personas in one spec: a volunteer offers help on an organization's need
// and the conversation lands on the KC chat backend for both sides; the
// duplicate-application guard holds on re-apply. Skips when unseeded.
import { test, expect } from '@playwright/test';
import { gloweUrl, skipUnlessSeeded, stateFile, waitForGloweBoard } from '../lib/glowe';

test.beforeEach(() => {
  skipUnlessSeeded(test);
});

test.describe('GloWe full flow: help on a need → conversation on both sides', () => {
  test('volunteer offers support and the org receives the chat', async ({ browser }) => {
    // Prefer a short alphanumeric stamp — long numeric Date.now() values have
    // been mangled in inbox previews (looked like a locale date fragment).
    const stamp = `e2e-${Date.now().toString(36)}`;

    // ── Side A: יוסי (volunteer) offers support on לב פתוח's seeded need ──
    const volunteer = await browser.newContext({ storageState: stateFile('yossi') });
    const pageA = await volunteer.newPage();
    await pageA.goto(gloweUrl('wishing-well.html'));
    await waitForGloweBoard(pageA, '#wishes-list .opportunity-card', 25_000);
    const wishCard = pageA.locator('#wishes-list .opportunity-card', { hasText: 'מתנדבים לחלוקת סלי חג' }).first();
    test.skip((await wishCard.count()) === 0, 'seeded wish "מתנדבים לחלוקת סלי חג" missing — re-run seed-glowe-dev.mjs');
    await expect(wishCard).toBeVisible({ timeout: 25_000 });
    await wishCard.getByRole('button', { name: 'Offer Support' }).click();
    await expect(pageA.locator('#connect-modal')).toBeVisible();
    await pageA.locator('#support-type').selectOption({ index: 1 });
    await pageA.locator('#support-availability').selectOption({ index: 1 });
    await pageA.locator('#connect-message').fill(`אשמח לעזור בחלוקה! (${stamp})`);
    await pageA.locator('#connect-modal button[type="submit"]').click();

    // FR-GLOWE-016 AC6 — the offer opens the 1:1 chat; clean URLs may omit `.html`.
    await expect(pageA).toHaveURL(/messages(\.html)?\?chat=/, { timeout: 25_000 });
    await expect(pageA.locator('.chat-bubble.mine').last()).toContainText(stamp, { timeout: 20_000 });
    await volunteer.close();

    // ── Side B: לב פתוח (org) sees the conversation with the seeded intro ──
    const org = await browser.newContext({ storageState: stateFile('levpatuach') });
    const pageB = await org.newPage();
    await pageB.goto(gloweUrl('messages.html'));
    // Localized inbox may show Hebrew or English display names for the volunteer.
    const inboxRow = pageB.locator('.chat-inbox-row').filter({ hasText: /יוסי מזרחי|Yossi Mizrahi/ }).first();
    await expect(inboxRow).toBeVisible({ timeout: 25_000 });
    await inboxRow.click();
    await expect(pageB.locator('.chat-bubble', { hasText: stamp }).first()).toBeVisible({ timeout: 25_000 });

    // The org replies; the reply lands in the same thread.
    await pageB.locator('.chat-send-form input').fill(`תודה רבה! נתאם בהמשך (${stamp})`);
    await pageB.locator('.chat-send-form button[type="submit"]').click();
    await expect(pageB.locator('.chat-bubble.mine', { hasText: stamp })).toBeVisible({ timeout: 20_000 });
    await org.close();
  });

  test('duplicate application guard holds on the seeded opportunity', async ({ browser }) => {
    // יוסי already has a seeded Pending application on the code-mentoring
    // opportunity — applying again must be blocked (FR-GLOWE-007 AC5 /
    // FR-GLOWE-012). The Apply control stays disabled until detail hydrate
    // wires the click handler (product contract — not a test-only wait).
    const volunteer = await browser.newContext({ storageState: stateFile('yossi') });
    const page = await volunteer.newPage();
    await page.goto(gloweUrl('opportunity.html?id=seed-opp-code-mentor'), { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.user-menu')).toBeVisible({ timeout: 20_000 });
    const applyButton = page.locator('#apply-btn');
    test.skip(!(await applyButton.count()) || await applyButton.isHidden(), 'seeded opportunity Apply control missing');
    await expect(page.locator('#opp-title')).not.toHaveText(/Loading/i, { timeout: 25_000 });
    await expect(applyButton).toBeEnabled({ timeout: 10_000 });
    await applyButton.click();

    const applyModal = page.locator('#apply-modal.active');
    await expect(applyModal).toBeVisible({ timeout: 10_000 });
    await applyModal.locator('#apply-availability').selectOption('flexible');
    await applyModal.locator('#apply-skills').fill('E2E skills');
    await applyModal.locator('#apply-motivation').fill('E2E duplicate-application guard');
    await applyModal.locator('button[type="submit"]').click();

    await expect(page.locator('#success-modal.active')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#success-modal.active')).toContainText(/Already applied|כבר/i);
    await volunteer.close();
  });
});
