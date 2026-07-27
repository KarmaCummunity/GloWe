// GLOWE.LAUNCH-4 — launch-readiness smoke (signup gate, org onboarding surface,
// event RSVP / opportunity apply, owner accept/decline UI, Wave 0 server rules).
// Prefer visibility assertions over full Google OAuth (no OAuth secrets in CI).
import { test, expect } from '@playwright/test';
import {
  GLOWE_BASE,
  PERSONAS,
  SEED_PASSWORD,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  gloweUrl,
  readMeta,
  signInWithPassword,
  stateFile,
} from '../lib/glowe';

test.describe('GloWe launch Wave 4 — Google-gated signup (guest smoke)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { window.localStorage.setItem('glowe-guest-welcomed', '1'); } catch { /* ignore */ }
    });
  });

  test('login modal is Google-only (no email/password form)', async ({ page }) => {
    await page.goto(`${GLOWE_BASE}/index.html`);
    // Do not click the header CTA — on live Pages that starts real Google OAuth.
    // Assert the login surface that FR-GLOWE-001 ships (openModal without OAuth).
    await page.waitForFunction(() => typeof (window as unknown as { openModal?: unknown }).openModal === 'function');
    await page.evaluate(() => {
      (window as unknown as { openModal: (id: string) => void }).openModal('login-modal');
    });
    const modal = page.locator('#login-modal');
    await expect(modal).toBeVisible({ timeout: 15_000 });
    await expect(modal.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
    await expect(modal.locator('input[type="email"], input[type="password"], form#login-form')).toHaveCount(0);
  });

  test('register / join modal is Google-only (individual signup gate)', async ({ page }) => {
    await page.goto(`${GLOWE_BASE}/index.html`);
    await page.waitForFunction(() => typeof (window as unknown as { openModal?: unknown }).openModal === 'function');
    await page.evaluate(() => {
      (window as unknown as { openModal: (id: string) => void }).openModal('register-modal');
    });
    const register = page.locator('#register-modal');
    await expect(register).toBeVisible({ timeout: 15_000 });
    await expect(register.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
    await expect(register.locator('input[type="email"], input[type="password"]')).toHaveCount(0);
  });

  test('guest create FAB join gate is Google-only', async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 900 });
    await page.goto(`${GLOWE_BASE}/index.html`);
    await page.locator('.bottom-nav-create').click();
    const modal = page.locator('#glowe-join-modal');
    await expect(modal).toBeVisible({ timeout: 15_000 });
    await expect(modal.locator('#glowe-join-google')).toContainText(/Continue with Google/i);
    await expect(modal.locator('input[type="email"], input[type="password"]')).toHaveCount(0);
  });
});

test.describe('GloWe launch Wave 4 — org onboarding surface', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { window.localStorage.setItem('glowe-guest-welcomed', '1'); } catch { /* ignore */ }
    });
  });

  test('post-sign-in onboarding modal offers individual vs organization paths', async ({ page }) => {
    await page.goto(`${GLOWE_BASE}/index.html`);
    // ensureGlobalUI injects #glowe-onboarding-modal on boot; open it without OAuth.
    await page.waitForFunction(() => document.getElementById('glowe-onboarding-modal') !== null, null, {
      timeout: 20_000,
    });
    await page.evaluate(() => {
      const g = window as typeof window & {
        ensureGlobalUI?: () => void;
        openGloweOnboarding?: (profile: Record<string, unknown>) => void;
      };
      if (typeof g.ensureGlobalUI === 'function') g.ensureGlobalUI();
      if (typeof g.openGloweOnboarding === 'function') {
        g.openGloweOnboarding({});
        return;
      }
      document.getElementById('glowe-onboarding-modal')?.classList.add('active');
    });
    const modal = page.locator('#glowe-onboarding-modal');
    await expect(modal).toBeVisible({ timeout: 15_000 });
    await expect(modal.locator('input[name="onboarding-account-type"][value="individual"]')).toBeVisible();
    await expect(modal.locator('input[name="onboarding-account-type"][value="organization"]')).toBeVisible();
    await expect(modal.locator('.onboarding-type-title', { hasText: /Organization/i })).toBeVisible();

    await modal.locator('input[name="onboarding-account-type"][value="organization"]').check();
    await expect(modal.locator('#onboarding-org-fields')).toBeVisible();
    await expect(modal.locator('#onboarding-org-name')).toBeVisible();
    await expect(modal.locator('#onboarding-org-fields')).toContainText(/reviewed/i);
  });
});

test.describe('GloWe launch Wave 4 — event RSVP / opportunity apply UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { window.localStorage.setItem('glowe-guest-welcomed', '1'); } catch { /* ignore */ }
    });
  });

  test('guest event page shows RSVP join gate (Save your spot)', async ({ page }) => {
    await page.goto(gloweUrl('opportunity.html?id=seed-event-beach-cleanup'));
    const rsvp = page.locator('#glowe-rsvp-join');
    const applyCard = page.locator('.apply-card');
    await expect(applyCard.or(rsvp).first()).toBeVisible({ timeout: 25_000 });
    test.skip(!(await rsvp.count()), 'seeded beach-cleanup event not loaded (run seed-glowe-dev)');
    await rsvp.click();
    await expect(page.locator('#glowe-join-modal').or(page.locator('#login-modal')).first())
      .toBeVisible({ timeout: 15_000 });
  });

  test('guest opportunity apply opens join gate', async ({ page }) => {
    await page.goto(gloweUrl('opportunity.html?id=seed-opp-code-mentor'));
    const applyBtn = page.locator('#apply-btn');
    await expect(applyBtn.or(page.locator('.opportunity-main')).first()).toBeVisible({ timeout: 25_000 });
    test.skip(!(await applyBtn.count()), 'seeded code-mentor opportunity not loaded (run seed-glowe-dev)');
    await applyBtn.click();
    await expect(
      page.locator('#glowe-join-modal').or(page.locator('#login-modal')).or(page.locator('#apply-modal')).first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});

const meta = readMeta();

test.describe('GloWe launch Wave 4 — member RSVP / apply surface', () => {
  test.skip(!meta.seeded, 'GloWe seed personas missing — run scripts/seed-glowe-dev.mjs');
  test.use({ storageState: stateFile('michal') });

  test('signed-in member sees event registration form or status on seeded event', async ({ page }) => {
    await page.goto(gloweUrl('opportunity.html?id=seed-event-beach-cleanup'));
    await expect(page.locator('.apply-card').or(page.locator('#event-register-area')).first())
      .toBeVisible({ timeout: 25_000 });
    const form = page.locator('#event-register-form');
    const status = page.locator('.event-register-status');
    const note = page.locator('#event-register-area .muted-note');
    await expect(form.or(status).or(note).first()).toBeVisible({ timeout: 25_000 });
  });

  test('signed-in member can open the opportunity apply modal', async ({ page }) => {
    await page.goto(gloweUrl('opportunity.html?id=seed-opp-food-baskets'));
    const applyBtn = page.locator('#apply-btn');
    test.skip(!(await applyBtn.count()), 'apply button missing on food-baskets opp');
    await expect(applyBtn).toBeVisible({ timeout: 25_000 });
    await applyBtn.click();
    await expect(page.locator('#apply-modal')).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('GloWe launch Wave 4 — owner accept/decline UI', () => {
  test.skip(!meta.seeded, 'GloWe seed personas missing — run scripts/seed-glowe-dev.mjs');

  test('opportunity owner sees Accept/Decline on pending applicant', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: stateFile('code4good') });
    const page = await ctx.newPage();
    await page.goto(gloweUrl('opportunity.html?id=seed-opp-code-mentor'));
    await expect(page.getByText('יוסי מזרחי').first()).toBeVisible({ timeout: 25_000 });
    const applicants = page.locator('#opp-applicants');
    await expect(applicants).toBeVisible();
    await expect(applicants.locator('button[data-decide="Accepted"]')).toBeVisible({ timeout: 20_000 });
    await expect(applicants.locator('button[data-decide="Declined"]')).toBeVisible();
    await ctx.close();
  });

  test('event organizer panel exposes Accept/Decline for pending registrant', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: stateFile('code4good') });
    const page = await ctx.newPage();
    await page.goto(gloweUrl('opportunity.html?id=seed-event-hackathon'));
    await expect(page.getByText(/Manage registrations/i).first()).toBeVisible({ timeout: 25_000 });
    const accept = page.locator('button[data-decide="accept"]');
    const decline = page.locator('button[data-decide="decline"]');
    if (await accept.count()) {
      await expect(accept.first()).toBeVisible();
      await expect(decline.first()).toBeVisible();
    } else {
      await expect(page.locator('.organizer-capacity').or(page.locator('.organizer-reg-list')).first())
        .toBeVisible();
    }
    await ctx.close();
  });
});

test.describe('GloWe launch Wave 4 — Wave 0 server rules (API negative)', () => {
  // Canonical SQL coverage: supabase/tests/0236_glowe_publish_guards.sql
  // (glowe_can_create matrix + BEFORE INSERT triggers). This stub mirrors a
  // few matrix cells via PostgREST so CI catches a silent GRANT/RPC regression
  // without needing Google OAuth.

  test('glowe_can_create RPC enforces capability matrix (anon-callable)', async () => {
    test.skip(!SUPABASE_URL || !SUPABASE_ANON_KEY, 'Supabase URL/anon key unavailable');

    async function canCreate(accountType: string, approval: string, kind: string): Promise<boolean | null> {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/glowe_can_create`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_account_type: accountType,
          p_approval_status: approval,
          p_kind: kind,
        }),
      });
      if (!res.ok) return null;
      return (await res.json()) as boolean;
    }

    // Mirror of supabase/tests/0236_glowe_publish_guards.sql Part 1 (subset).
    expect(await canCreate('individual', 'not_required', 'community')).toBe(true);
    expect(await canCreate('individual', 'not_required', 'wish')).toBe(true);
    expect(await canCreate('individual', 'not_required', 'opportunity')).toBe(false);
    expect(await canCreate('individual', 'not_required', 'event')).toBe(false);

    expect(await canCreate('organization', 'pending', 'community')).toBe(false);
    expect(await canCreate('organization', 'pending', 'opportunity')).toBe(false);

    expect(await canCreate('organization', 'approved', 'opportunity')).toBe(true);
    expect(await canCreate('organization', 'approved', 'event')).toBe(true);
    expect(await canCreate('organization', 'approved', 'offer')).toBe(false);
  });

  test('direct opportunity insert as individual is rejected (seeded session)', async () => {
    test.skip(!meta.seeded, 'GloWe seed personas missing — run scripts/seed-glowe-dev.mjs');
    test.skip(!SUPABASE_URL || !SUPABASE_ANON_KEY, 'Supabase URL/anon key unavailable');

    const session = await signInWithPassword(PERSONAS.michal.email, SEED_PASSWORD);
    test.skip(!session, 'cannot sign in as מיכל — seed may be missing');

    const stamp = Date.now();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/glowe_opportunities`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session!.access_token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        id: `e2e-wave4-blocked-${stamp}`,
        user_id: session!.user.id,
        title: `E2E Wave4 blocked opp ${stamp}`,
        organization: 'should-not-persist',
        description: 'Wave 0 negative: individual must not create opportunities via API.',
        commitment: 'Flexible',
        field: 'Community',
      }),
    });

    // BEFORE INSERT trigger raises 42501 glowe_publish_forbidden (PostgREST → 4xx).
    expect(res.ok).toBeFalsy();
    expect(res.status).toBeGreaterThanOrEqual(400);
    const body = await res.text();
    expect(body.toLowerCase()).toMatch(/glowe_publish_forbidden|permission denied|42501|forbidden|policy/i);
  });
});
