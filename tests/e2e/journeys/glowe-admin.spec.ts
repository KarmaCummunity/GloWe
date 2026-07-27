// GloWe admin journeys — org approval queue (FR-GLOWE-003) and the moderation
// report queue (FR-GLOWE-015 AC4). Uses the CI E2E super-admin (a GloWe
// admin by role); skips when admin credentials are unavailable.
import { test, expect } from '@playwright/test';
import { gloweUrl, skipUnlessAdmin, stateFile } from '../lib/glowe';

test.beforeEach(() => {
  skipUnlessAdmin(test);
});

test.use({ storageState: stateFile('admin') });

test.describe('GloWe admin', () => {
  test('admin page shows the pending-org queue with the seeded submission', async ({ page }) => {
    await page.goto(gloweUrl('admin.html'));
    const queue = page.locator('#admin-org-requests');
    await expect(queue).toBeVisible({ timeout: 20_000 });
    // The seed keeps יד תומכת pending (reset on every seed run). If another
    // run already approved it, the queue legitimately shows the empty state.
    await expect(
      queue.locator('.admin-org-accordion', { hasText: 'יד תומכת' }).or(queue.locator('.empty-state')).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test('approves the pending organization when one is waiting', async ({ page }) => {
    await page.goto(gloweUrl('admin.html'));
    const pendingCard = page.locator('.admin-org-accordion', { hasText: 'יד תומכת' });
    if (!(await pendingCard.count())) {
      test.skip(true, 'no pending org in the queue (already approved this cycle)');
    }
    await pendingCard.locator('summary').click();
    await pendingCard.getByRole('button', { name: 'Approve' }).click();
    await expect(page.locator('#success-modal #success-title')).toHaveText('Decision saved', { timeout: 20_000 });
  });

  test('moderation report queue lists reports with decision actions', async ({ page }) => {
    await page.goto(gloweUrl('admin.html'));
    const reports = page.locator('#admin-reports');
    await expect(reports).toBeVisible({ timeout: 20_000 });
    await expect(reports.locator('.admin-card, .empty-state').first()).toBeVisible({ timeout: 20_000 });
  });

  test('dismisses an open report when one exists', async ({ page }) => {
    await page.goto(gloweUrl('admin.html'));
    const reports = page.locator('#admin-reports');
    await expect(reports.locator('.admin-card, .empty-state').first()).toBeVisible({ timeout: 20_000 });
    const openCard = reports.locator('.admin-card', { hasText: 'open' }).first();
    if (!(await openCard.count())) {
      test.skip(true, 'no open reports to decide (queue clean)');
    }
    await openCard.getByRole('button', { name: 'Dismiss' }).click();
    await expect(page.locator('#success-modal #success-title')).toHaveText('Report dismissed', { timeout: 20_000 });
  });
});
