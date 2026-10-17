import { test as setup, expect, type Page } from '@playwright/test';
import { BASE_URL, STORAGE_A, STORAGE_B, USER_A, USER_B } from '../lib/env';
import { sessionFor } from '../lib/api';
import { dismissGates } from '../lib/app';

async function injectAndSave(page: Page, user: { email: string; password: string }, paths: string[]) {
  const { storageKey, session } = await sessionFor(user);
  await page.goto(`${BASE_URL}/`);
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
    key: storageKey,
    value: session,
  });
  await page.reload({ waitUntil: 'networkidle' });
  await dismissGates(page);
  const feed = page.getByTestId('feed-screen');
  if (!(await feed.isVisible({ timeout: 5_000 }).catch(() => false))) {
    await page.getByRole('tab', { name: 'בית' }).click().catch(() => {});
  }
  await expect(feed).toBeVisible({ timeout: 45_000 });
  for (const p of paths) await page.context().storageState({ path: p });
}

setup('session: seeded user A', async ({ page }) => {
  await injectAndSave(page, USER_A, [STORAGE_A, '.auth/user.json']);
});

setup('session: seeded user B', async ({ page }) => {
  await injectAndSave(page, USER_B, [STORAGE_B]);
});
