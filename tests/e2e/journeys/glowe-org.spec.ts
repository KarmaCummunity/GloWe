// GloWe organization journeys — org create menu (FR-GLOWE-016 AC3), event
// publishing with cleanup (AC4), and the owner's applicant inbox
// (FR-GLOWE-012). Uses the seeded approved orgs; skips when unseeded.
import { test, expect } from '@playwright/test';
import {
  gloweUrl, GLOWE_BASE, PERSONAS, SEED_PASSWORD,
  personaRest, skipUnlessSeeded, signInWithPassword, stateFile,
} from '../lib/glowe';

test.beforeEach(() => {
  skipUnlessSeeded(test);
});

test.describe('GloWe organization (approved)', () => {
  test.use({ storageState: stateFile('levpatuach') });

  test('create menu offers the organization set: post, event, opportunity, need', async ({ page }) => {
    await page.goto(`${GLOWE_BASE}/index.html`);
    await expect(page.locator('.user-menu')).toBeVisible({ timeout: 20_000 });
    await page.locator('.header-create-btn').click();
    const options = page.locator('#glowe-create-options .create-menu-option');
    await expect(options).toHaveCount(4);
    await expect(options.nth(0)).toContainText('Post');
    await expect(options.nth(1)).toContainText('Event');
    await expect(options.nth(2)).toContainText('Volunteer Opportunity');
    await expect(options.nth(3)).toContainText('Need');
  });

  test('event form validates required fields before publishing', async ({ page }) => {
    await page.goto(`${GLOWE_BASE}/index.html`);
    await expect(page.locator('.user-menu')).toBeVisible({ timeout: 20_000 });
    await page.locator('.header-create-btn').click();
    await page.locator('#glowe-create-options .create-menu-option', { hasText: 'Event' }).click();
    await expect(page.locator('#glowe-event-modal')).toBeVisible();
    // Fill only the title and force-submit — client validation must block on
    // the missing start date (the native `required` is bypassed via evaluate).
    await page.locator('#event-title').fill('E2E אירוע חסר תאריך');
    await page.locator('#event-start').evaluate((el: HTMLInputElement) => el.removeAttribute('required'));
    await page.locator('#glowe-event-modal button[type="submit"]').click();
    await expect(page.locator('#success-modal #success-title')).toHaveText('Missing details');
  });

  test('publishes an event end-to-end and cleans it up', async ({ page }) => {
    const stamp = Date.now();
    await page.goto(`${GLOWE_BASE}/index.html`);
    await expect(page.locator('.user-menu')).toBeVisible({ timeout: 20_000 });
    await page.locator('.header-create-btn').click();
    await page.locator('#glowe-create-options .create-menu-option', { hasText: 'Event' }).click();
    await page.locator('#event-title').fill(`E2E-${stamp} מפגש מתנדבים`);
    await page.locator('#event-description').fill('אירוע בדיקה אוטומטי — נמחק מיד בסיום הבדיקה.');
    const start = new Date(Date.now() + 21 * 24 * 3600 * 1000).toISOString().slice(0, 16);
    await page.locator('#event-start').fill(start);
    await page.locator('#event-capacity').fill('10');
    await page.locator('#glowe-event-modal button[type="submit"]').click();
    // FR-GLOWE-016 AC4 — quiet confirmation is a toast, not the success modal.
    const toast = page.locator('#glowe-toast.visible');
    await expect(toast).toBeVisible({ timeout: 20_000 });
    await expect(toast).toContainText(/Event published|האירוע פורסם/i);

    // Cleanup: delete the event as its owner via REST (owner-write RLS).
    const session = await signInWithPassword(PERSONAS.levpatuach.email, SEED_PASSWORD);
    expect(session).toBeTruthy();
    const res = await personaRest(session!, `glowe_opportunities?title=eq.${encodeURIComponent(`E2E-${stamp} מפגש מתנדבים`)}`, { method: 'DELETE' });
    expect(res.ok).toBeTruthy();
  });
});

test.describe('GloWe organization applicant inbox', () => {
  test.use({ storageState: stateFile('code4good') });

  test('owner sees the seeded pending application on the opportunity page', async ({ page }) => {
    await page.goto(gloweUrl('opportunity.html?id=seed-opp-code-mentor'));
    // The seeded application from יוסי מזרחי is Pending — the owner-side
    // applicants panel should list it.
    await expect(page.getByText('יוסי מזרחי').first()).toBeVisible({ timeout: 25_000 });
  });
});
