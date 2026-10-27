import { expect, type Page } from '@playwright/test';

/** Dismiss legal/consent gates that can appear on first load. */
export async function dismissGates(page: Page) {
  for (const name of ['המשך', 'אישור', 'Continue', 'OK']) {
    const b = page.getByRole('button', { name, exact: true });
    if (await b.isVisible({ timeout: 1_500 }).catch(() => false)) await b.click();
  }
}

/** Collect failed Supabase calls (4xx/5xx) so specs can assert there are none. */
export function trackApiErrors(page: Page) {
  const errors: string[] = [];
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().includes('.supabase.co/')) {
      errors.push(`${r.status()} ${r.request().method()} ${r.url().split('?')[0]}`);
    }
  });
  return errors;
}

/** Raw i18n keys like `donations.marketplaceHubTitle` leaking into the UI. */
export async function expectNoRawI18nKeys(page: Page) {
  const body = await page.locator('body').innerText();
  const leaks = body.match(/\b(?:donations|marketplace|givingHandoff|post|feed|chat|notifications|settings|matches)\.[a-z][A-Za-z]+(?:\.[A-Za-z]+)*\b/g) ?? [];
  expect(leaks, `raw i18n keys on ${page.url()}`).toEqual([]);
}

export async function gotoApp(page: Page, path: string) {
  await page.goto(path);
  await dismissGates(page);
}
