// Matching v2 (0420–0423) — "Matches for you" on kc-dev.
import { test, expect } from '@playwright/test';
import { expectNoRawI18nKeys, gotoApp, trackApiErrors } from '../../lib/app';
import { rest, sessionFor } from '../../lib/api';
import { USER_A } from '../../lib/env';

type MatchRow = { candidate_id: string; my_listing_id: string; other_listing_id: string; score: number };

test('api: rpc_my_matches returns only my pairs; internals are not client-callable', async () => {
  const { session } = await sessionFor(USER_A);
  const token = session.access_token as string;
  const rows = await rest<MatchRow[]>(token, 'rpc/rpc_my_matches', { method: 'POST', body: { p_limit: 20 } });
  expect(Array.isArray(rows)).toBe(true);
  for (const r of rows) {
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(1);
    expect(r.my_listing_id).not.toEqual(r.other_listing_id);
  }
  await expect(
    rest(token, 'rpc/match_run_sweep', { method: 'POST', body: { p_batch: 1 } }),
  ).rejects.toThrow(/^(401|403|404)/);
  await expect(
    rest(token, 'rpc/api_match_llm_pending', { method: 'POST', body: { p_limit: 1 } }),
  ).rejects.toThrow(/^(401|403|404)/);
});

test('ui: /matches renders the list or the empty state without API errors', async ({ page }) => {
  const errors = trackApiErrors(page);
  await gotoApp(page, '/matches');
  await expect(page.getByTestId('matches-screen')).toBeVisible();
  await page.waitForLoadState('networkidle');
  const cards = page.locator('[data-testid^="match-card-"]');
  if ((await cards.count()) > 0) {
    await expect(cards.first()).toBeVisible();
  } else {
    await expect(page.getByTestId('matches-empty')).toBeVisible();
  }
  await expectNoRawI18nKeys(page);
  expect(errors).toEqual([]);
});
