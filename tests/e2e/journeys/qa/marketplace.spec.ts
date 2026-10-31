import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
import { expectNoRawI18nKeys, gotoApp, trackApiErrors } from '../../lib/app';
import { cleanupE2eContent, rest, runTag, sessionFor } from '../../lib/api';
import { STORAGE_B, USER_A } from '../../lib/env';

async function anyOpenItemListing(): Promise<{ listing_id: string; title: string }> {
  const { session } = await sessionFor(USER_A);
  const me = (session.user as { id: string }).id;
  const [row] = await rest<{ listing_id: string; title: string }[]>(
    session.access_token as string,
    `marketplace_listing_card?select=listing_id,title&world_slug=eq.items&owner_id=neq.${me}&limit=1`,
  );
  if (!row) throw new Error('no items listings on kc-dev');
  return row;
}

/** The unified create screen (`/create?category=<world>`) replaced the per-world create routes. */
async function fillItemForm(page: Page, title: string) {
  await gotoApp(page, '/create?category=items');
  await page.getByTestId('create-direction-give').click();
  await page.getByText('מסירת חפץ', { exact: true }).first().click();
  const titleInput = page.getByTestId('listing-title').or(page.locator('input[type="text"], input:not([type])').first());
  await titleInput.first().fill(title);
}

const publishButton = (page: Page) => page.getByTestId('listing-publish').or(page.getByText('פרסום', { exact: true }).last()).first();
const addPhotoButton = (page: Page) => page.getByTestId('listing-add-photo').or(page.getByText('+', { exact: true }).last()).first();

test('browse: marketplace lists open listings with translated labels', async ({ page }) => {
  const errors = trackApiErrors(page);
  await gotoApp(page, '/donations/marketplace');
  await expect(page.getByText('כל העולמות', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/פרסום מודעה/).first()).toBeVisible();
  await page.waitForLoadState('networkidle');
  // World filter chips and card meta must be human labels, not slugs like "items" / "ride_offer".
  const body = await page.locator('body').innerText();
  expect(body).not.toMatch(/\b(?:ride_offer|ride_request|app_design)\b/);
  expect(body).not.toMatch(/·\s*(?:give|request)\s*·/);
  await expectNoRawI18nKeys(page);
  expect(errors).toEqual([]);
});

test('search: query filters listings', async ({ page }) => {
  const target = await anyOpenItemListing();
  await gotoApp(page, '/donations/marketplace');
  const q = target.title.split(' ')[0]!;
  await page.getByPlaceholder('חיפוש מודעות…').fill(q);
  await expect(page.getByText(target.title, { exact: false }).first()).toBeVisible();
});

test('listing detail opens for an existing listing', async ({ page }) => {
  const errors = trackApiErrors(page);
  const target = await anyOpenItemListing();
  await gotoApp(page, `/donations/marketplace/${target.listing_id}`);
  await expect(page.getByText(target.title).first()).toBeVisible();
  await expect(page.getByText('המודעה לא נמצאה.')).toHaveCount(0);
  expect(errors.filter((e) => e.includes('get_marketplace_listing_detail'))).toEqual([]);
});

test('create item form shows human labels (no raw schema keys)', async ({ page }) => {
  await gotoApp(page, '/create?category=items');
  await expect(page.getByTestId('unified-create-header')).toBeVisible();
  await page.getByTestId('create-direction-give').click();
  await expect(page.getByText('מסירת חפץ', { exact: true }).first()).toBeVisible();
  const body = await page.locator('body').innerText();
  expect(body).not.toMatch(/\b(?:image url|image path|pickup mode|fulfillment mode|owner_approval|fcfs|items)\b/);
});

test.describe.serial('create + reserve', () => {
  let listingTitle = '';

  test('create an item listing WITHOUT a photo', async ({ page }) => {
    const title = `${runTag()} כיסא ללא תמונה`;
    await fillItemForm(page, title);
    await publishButton(page).click();
    await expect(page).toHaveURL(/\/donations\/marketplace\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    await expect(page.getByText(title).first()).toBeVisible();
  });

  test('create an item listing WITH a photo', async ({ page }) => {
    listingTitle = `${runTag()} שולחן עם תמונה`;
    await fillItemForm(page, listingTitle);
    const chooser = page.waitForEvent('filechooser');
    await addPhotoButton(page).click();
    await (await chooser).setFiles(path.join(HERE, '../../fixtures/item.png'));
    await expect(page.locator('img').last()).toBeVisible();
    await publishButton(page).click();
    await expect(page).toHaveURL(/\/donations\/marketplace\/[0-9a-f-]{36}$/, { timeout: 45_000 });
    await expect(page.getByText(listingTitle).first()).toBeVisible();
  });

  test('another user reserves the item', async ({ browser }) => {
    test.skip(!listingTitle, 'create-with-photo did not run');
    const { session } = await sessionFor(USER_A);
    const [row] = await rest<{ listing_id: string }[]>(
      session.access_token as string,
      `marketplace_listing_card?select=listing_id&title=eq.${encodeURIComponent(listingTitle)}`,
    );
    test.skip(!row, 'listing was not created');
    const ctx = await browser.newContext({ storageState: STORAGE_B, locale: 'he-IL' });
    const page = await ctx.newPage();
    await gotoApp(page, `/donations/marketplace/${row!.listing_id}`);
    const reserve = page.getByTestId('giving-handoff-reserve').or(page.getByText('שריון הפריט', { exact: true })).first();
    await reserve.click();
    await expect(reserve).toHaveCount(0, { timeout: 20_000 });
    await ctx.close();
  });
});

test.afterAll(async () => {
  await cleanupE2eContent(USER_A);
});
