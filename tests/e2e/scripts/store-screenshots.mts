// Store screenshots from the dev web build (seed user A, he-IL). Run from tests/e2e after the
// auth setup has written .auth/user-a.json:  npx tsx scripts/store-screenshots.mts ../../docs/store/screenshots
// Hides the red DEV strip and drops automated-test rows ("[e2e …]") from API responses client-side.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const BASE = 'https://dev.karma-community.pages.dev';
const OUT = process.argv[2];
const devices = [
  { dir: 'iphone-6.9', w: 440, h: 956, s: 3 },   // 1320x2868
  { dir: 'iphone-6.5', w: 414, h: 896, s: 3 },   // 1242x2688
  { dir: 'android-phone', w: 360, h: 640, s: 3 }, // 1080x1920
];
const screens = (process.env.SHOTS ?? '01-feed:/,02-donations:/donations,03-money:/donations/money,04-search:/search,05-chat:/chat,06-profile:/profile').split(',').map((x) => x.split(/:(.*)/s).slice(0, 2));
const browser = await chromium.launch();
for (const d of devices) {
  mkdirSync(`${OUT}/${d.dir}`, { recursive: true });
  const ctx = await browser.newContext({
    storageState: '.auth/user-a.json', viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.s,
    isMobile: true, hasTouch: true, locale: 'he-IL', timezoneId: 'Asia/Jerusalem',
  });
  const page = await ctx.newPage();
  // Drop automated-test rows ("[e2e …]", QA probes) from API responses, client-side only.
  const NOISE = /e2e|\bQA\b|playwright|probe/i;
  await page.route(/supabase\.co\/(rest|functions)\/v1\//, async (route) => {
    const resp = await route.fetch().catch(() => null);
    if (!resp) return route.abort();
    const ct = resp.headers()['content-type'] ?? '';
    if (!ct.includes('json')) return route.fulfill({ response: resp });
    let json: unknown;
    try { json = await resp.json(); } catch { return route.fulfill({ response: resp }); }
    const clean = (v: unknown): unknown => Array.isArray(v) ? v.filter((x) => !NOISE.test(JSON.stringify(x))).map(clean)
      : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, Array.isArray(x) ? clean(x) : x])) : v;
    return route.fulfill({ response: resp, json: clean(json) });
  });
  for (const [name, path] of screens) {
    await page.goto(BASE + path, { waitUntil: 'networkidle' }).catch(() => {});
    for (const n of ['המשך', 'אישור', 'הבנתי', 'סגור']) {
      const b = page.getByRole('button', { name: n, exact: true });
      if (await b.isVisible({ timeout: 800 }).catch(() => false)) await b.click().catch(() => {});
    }
    await page.waitForTimeout(3500);
    await page.evaluate(() => {
      for (const el of Array.from(document.querySelectorAll<HTMLElement>('div'))) {
        const cs = getComputedStyle(el);
        if (cs.backgroundColor === 'rgb(185, 28, 28)' && cs.position === 'absolute' && el.innerText.length < 120) el.style.display = 'none';
      }
    });
    await page.screenshot({ path: `${OUT}/${d.dir}/${name}.png` });
    console.log(d.dir, name, page.url());
  }
  await ctx.close();
}
await browser.close();
