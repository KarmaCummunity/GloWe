# Comprehensive Quality Automation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve from unit tests + manual dev smoke into a layered, automated quality system: E2E user journeys on the live dev deployment, integration/RLS probes, performance budgets, and accessibility gates — with `dev` → `main` release blocked until P0 journeys pass.

**Architecture:** Keep the existing pyramid (domain/application vitest, CI backend local Supabase stack, bundle smoke). Add a new `tests/e2e/` Playwright suite targeting `DEV_WEB_URL` (Railway + Supabase dev). Gate **only** release PRs to `main` on P0 E2E first; expand coverage and add Lighthouse/k6/axe in later waves without blocking every feature PR on `dev`. Record policy in `docs/SSOT/TESTING.md` and `D-55` in `DECISIONS.md`.

**Tech Stack:** Playwright (Web E2E), Vitest (unit + Supabase integration, existing), GitHub Actions, Lighthouse CI, k6 (API load), `@axe-core/playwright` (a11y), Maestro (native E2E — Wave 6).

**NFR mapping (archive SRS):** `docs/SSOT/archive/SRS/04_non_functional/01_performance_scalability_availability.md`, `03_accessibility_i18n.md`, `07_acceptance.md`.

## Operating model (AI developers, human users)

- **Developers:** AI agents only — PRs to `dev`, releases via PR `dev` → `main`.
- **Users:** Humans on Web; E2E uses real email/password sign-in (no dev ghost-session shortcuts).
- **PM gate:** Optional spot-check on dev; automated P0 E2E required on release PR to `main`.

### Implementation status (2026-05-28)

| Wave | Status | Notes |
| --- | --- | --- |
| 0 | ✅ Done | `TESTING.md`, `D-55`, scripts, SSOT |
| 1 | 🟡 Code on `feat/INFRA-QA-W1-e2e-p0-gate` | Needs GitHub `DEV_WEB_URL` + `E2E_*` secrets + required check on `main` |
| 2–7 | ⏳ Planned | |

**PM one-time setup:** GitHub Variables/Secrets per `ENVIRONMENTS.md` § E2E automation; branch protection on `main` → require **CI — E2E dev / user journeys (P0)**.

---

## Current state (baseline)

| Layer | Exists today | Gap |
| --- | --- | --- |
| Unit | ~250 vitest files in `app/packages/**/__tests__` | Good for domain/application; not user-visible |
| Bundle smoke | `scripts/smoke-web-bundle.mjs` + Playwright in `ci-frontend` | No real Supabase; no login |
| Backend CI | Local Supabase + `sqlProbes.integration.test.ts` + RLS lint | Not full persona fuzzer (`NFR-SEC-002`) |
| Dev smoke | Manual checklist in `RELEASE_CHECKLIST.md` | Not automated |
| Prod smoke | `prod-smoke.yml` — HTTP 200 only | Not functional |
| Performance | Sentry/observability waves (plans in `docs/SSOT/archive/superpowers/plans/2026-05-25-perf-*`) | No CI budgets |
| Native E2E | Mentioned in specs; not implemented | Maestro deferred |

---

## Target end state (quality pyramid)

```
                    ┌─────────────────────┐
                    │ Synthetic prod cron │  Wave 7 — post-merge, non-blocking first
                    └──────────┬──────────┘
               ┌───────────────┴───────────────┐
               │  Maestro native smoke (iOS)   │  Wave 6 — optional main gate
               └───────────────┬───────────────┘
          ┌────────────────────┴────────────────────┐
          │ Lighthouse + k6 budgets (scheduled)    │  Wave 4 — warn → gate
          └────────────────────┬────────────────────┘
     ┌─────────────────────────┴─────────────────────────┐
     │ Playwright E2E — full domains on DEV_WEB_URL       │  Waves 1–2
     └─────────────────────────┬─────────────────────────┘
┌────────────────────────────┴────────────────────────────┐
│ Integration (Supabase personas) + contract + migrations │  Wave 3 + existing CI
└────────────────────────────┬────────────────────────────┘
┌────────────────────────────┴────────────────────────────┐
│ Unit vitest (domain, application, infra fakes)          │  Existing
└─────────────────────────────────────────────────────────┘
```

---

## File map (repo-wide)

| Path | Responsibility |
| --- | --- |
| `docs/SSOT/TESTING.md` | **Create** — canonical testing policy, gates, flake protocol |
| `docs/SSOT/BACKLOG.md` | **Modify** — `INFRA-QA-W0` … `INFRA-QA-W7` rows |
| `docs/SSOT/DECISIONS.md` | **Modify** — add `D-55` (E2E gate policy) |
| `docs/SSOT/RELEASE_CHECKLIST.md` | **Modify** — dev smoke → automated + exception path |
| `docs/SSOT/ENVIRONMENTS.md` | **Modify** — `DEV_WEB_URL`, E2E secrets table, required checks |
| `tests/e2e/playwright.config.ts` | **Create** — baseURL, retries, trace, RTL locale |
| `tests/e2e/auth.setup.ts` | **Create** — login → `tests/e2e/.auth/user.json` |
| `tests/e2e/fixtures/base.ts` | **Create** — shared `test`, `expect`, helpers |
| `tests/e2e/journeys/*.spec.ts` | **Create** — one file per release-critical flow |
| `tests/e2e/package.json` | **Create** — `@playwright/test` dep isolated from app |
| `.github/workflows/ci-e2e-dev.yml` | **Create** — E2E vs deployed dev |
| `.github/workflows/ci-perf-budget.yml` | **Create** — Wave 4 Lighthouse + k6 (scheduled + optional PR) |
| `.github/workflows/ci-a11y.yml` | **Create** — Wave 5 axe on critical routes |
| `scripts/wait-for-url.mjs` | **Create** — poll `DEV_WEB_URL` after deploy |
| `scripts/k6/feed-read.js` | **Create** — Wave 4 load script |
| `supabase/seed-e2e.sql` | **Create** — idempotent dev seed for E2E user + feed posts |
| `app/apps/mobile/...` | **Modify** — `testID` on auth/feed/chat entry points only |
| `app/package.json` | **Modify** — `test:e2e`, `test:e2e:ui` scripts |

---

## Wave 0 — Policy, accounts, and agent setup ✅

**Backlog ID:** `INFRA-QA-W0` — **Done (2026-05-28)**  
**Duration:** ~1 day  
**Blocks:** all other waves

### Task 0.1: Testing SSOT document

**Files:**
- Create: `docs/SSOT/TESTING.md`

- [ ] **Step 1: Create `docs/SSOT/TESTING.md`**

```markdown
# Testing & Quality Gates

## Pyramid
1. **Unit** — `cd app && pnpm test` (vitest). Required on every PR to `dev`.
2. **Contract / migrations** — existing `ci-backend`, `ci-contract`. Required on `dev`.
3. **Bundle smoke** — `smoke-web-bundle.mjs` on exported dist. Required on `dev`.
4. **E2E (Web)** — Playwright vs `DEV_WEB_URL`. Required on PR `dev` → `main` (P0 journeys).
5. **Performance** — Lighthouse + k6. Scheduled daily on `dev`; blocking gate only after Wave 4.2.
6. **Accessibility** — axe Playwright. Required on PRs touching `apps/mobile/**` after Wave 5.
7. **Native E2E** — Maestro. Manual / nightly until Wave 6.2.

## E2E test user (dev only)
- Email: stored in GitHub secret `E2E_TEST_EMAIL` (not in repo).
- Must have `account_status = 'active'` and verified email in Supabase dev.
- Must not be a production user.

## Flake protocol
1. First red without code change → re-run job once.
2. Second red → file `TECH_DEBT.md` row with reproducer; quarantine spec with `test.fixme` + linked TD only if P0 release blocked.
3. Never merge `dev` → `main` with a quarantined P0 spec.

## Selectors
- Prefer `testID` on React Native (`testID` → `data-testid` on Web).
- Fallback: `getByRole` with Hebrew `name` from i18n keys used in tests (document key in spec comment).
```

- [ ] **Step 2: Commit**

```bash
git add docs/SSOT/TESTING.md
git commit -m "docs(ssot): add TESTING.md quality pyramid and flake protocol"
```

---

### Task 0.2: Architecture decision D-55

**Files:**
- Modify: `docs/SSOT/DECISIONS.md`

- [ ] **Step 1: Append decision**

```markdown
### D-55 — E2E release gate on dev deployment (Web Playwright)

**Decision.** Production releases (`dev` → `main`) require green **CI — E2E dev / user journeys (P0)** against repository variable `DEV_WEB_URL` (`https://mvp-2-dev.up.railway.app`). Auth in CI uses email/password test user via GitHub secrets, not Google SSO. Feature PRs to `dev` do not require E2E initially (Wave 1.4 adds optional post-merge run on `dev` push).

**Rationale.** Manual dev smoke in `RELEASE_CHECKLIST.md` does not scale for agent CTO workflow (`D-53`). Playwright already used for bundle smoke; extending to live dev catches RLS + deploy + env-var wiring failures.

**Alternatives rejected.** Gate every PR to `dev` on E2E — too slow/flaky early. Cypress — no advantage over existing Playwright usage. Google SSO in CI — brittle.

**Affected docs.** `TESTING.md`, `RELEASE_CHECKLIST.md`, `ENVIRONMENTS.md`, `.github/workflows/ci-e2e-dev.yml`.
```

- [ ] **Step 2: Commit**

```bash
git add docs/SSOT/DECISIONS.md
git commit -m "docs(ssot): D-55 E2E release gate on dev deployment"
```

---

### Task 0.3: Dev E2E user + seed data

**Files:**
- Create: `supabase/seed-e2e.sql`
- Modify: `supabase/config.toml` (if seed not already included)

- [ ] **Step 1: Create `supabase/seed-e2e.sql`**

```sql
-- E2E fixture data for Supabase dev only. Idempotent.
-- Operator: create auth user matching E2E_TEST_EMAIL in Studio first, then run seed.

-- Example: ensure public.users row is active (replace :e2e_uid after user exists)
-- UPDATE public.users SET account_status = 'active' WHERE id = ':e2e_uid';
```

> **Operator note:** Create user in Supabase dev Auth UI with `E2E_TEST_EMAIL` / password matching `E2E_TEST_PASSWORD`. Confirm `account_status = 'active'`. Optionally insert 2–3 open posts via app once so feed spec has stable content.

- [ ] **Step 2: Apply on dev** (operator, dev project `roeefqpdbftlndzsvhfj`)

```bash
# From repo root, with dev credentials sourced
supabase db execute --file supabase/seed-e2e.sql --project-ref roeefqpdbftlndzsvhfj
```

- [ ] **Step 3: Commit SQL file**

```bash
git add supabase/seed-e2e.sql
git commit -m "chore(supabase): add idempotent e2e seed stub for dev"
```

---

### Task 0.4: GitHub variables and secrets

**Files:** GitHub UI only (document in `ENVIRONMENTS.md`)

- [ ] **Step 1: Add repository variable**

| Name | Value |
| --- | --- |
| `DEV_WEB_URL` | `https://mvp-2-dev.up.railway.app` |

- [ ] **Step 2: Add repository secrets**

| Name | Purpose |
| --- | --- |
| `E2E_TEST_EMAIL` | Playwright login |
| `E2E_TEST_PASSWORD` | Playwright login |

- [ ] **Step 3: Update `docs/SSOT/ENVIRONMENTS.md`** — add table under new `## E2E automation` section referencing `TESTING.md`.

- [ ] **Step 4: Commit doc change**

```bash
git add docs/SSOT/ENVIRONMENTS.md
git commit -m "docs(ssot): document DEV_WEB_URL and E2E secrets"
```

---

### Task 0.5: BACKLOG rows

**Files:**
- Modify: `docs/SSOT/BACKLOG.md`

- [ ] **Step 1: Add INFRA section rows**

```markdown
| INFRA-QA-W0 | Testing policy + D-55 + dev E2E user setup | infra | ⏳ Planned | `docs/SSOT/TESTING.md`, `D-55` |
| INFRA-QA-W1 | Playwright P0 journeys + main release gate | infra | ⏳ Planned | `RELEASE_CHECKLIST.md`, Wave 1 |
| INFRA-QA-W2 | E2E domain expansion (posts, chat, donations, research) | infra | ⏳ Planned | spec domains 04–16 |
| INFRA-QA-W3 | RLS persona integration suite (`NFR-SEC-002`) | infra | ⏳ Planned | `sqlProbes` pattern |
| INFRA-QA-W4 | Performance budgets Lighthouse + k6 (`NFR-PERF-*`) | infra | ⏳ Planned | scheduled CI |
| INFRA-QA-W5 | Accessibility axe gate (`NFR-A11Y-*`) | infra | ⏳ Planned | critical routes |
| INFRA-QA-W6 | Maestro native smoke (iOS first) | infra | ⏳ Planned | nightly |
| INFRA-QA-W7 | Expanded prod synthetic monitoring | infra | ⏳ Planned | `prod-smoke.yml` |
```

- [ ] **Step 2: Commit**

```bash
git add docs/SSOT/BACKLOG.md
git commit -m "docs(ssot): backlog rows for quality automation waves"
```

---

## Wave 1 — E2E P0 (release gate) 🟡

**Backlog ID:** `INFRA-QA-W1` — **Implemented in `feat/INFRA-QA-W1-e2e-p0-gate`; pending secrets + first green CI**  
**Duration:** ~3–5 days  
**Maps to:** `RELEASE_CHECKLIST.md` (auth, feed, create-post, chat inbox)

**Repo deliverables:** `tests/e2e/`, `ci-e2e-dev.yml`, `testID` hooks, `pnpm test:e2e`. **Auth:** API session injection (`lib/supabaseSession.ts`) — option 3, not `/sign-in` UI.

### Task 1.1: E2E package scaffold

**Files:**
- Create: `tests/e2e/package.json`
- Create: `tests/e2e/playwright.config.ts`
- Create: `tests/e2e/.gitignore`

- [ ] **Step 1: Create `tests/e2e/package.json`**

```json
{
  "name": "@kc/e2e",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "install:browsers": "playwright install --with-deps chromium"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.0"
  }
}
```

- [ ] **Step 2: Create `tests/e2e/.gitignore`**

```
.auth/
test-results/
playwright-report/
blob-report/
```

- [ ] **Step 3: Create `tests/e2e/playwright.config.ts`**

```typescript
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.DEV_WEB_URL ?? 'http://127.0.0.1:8765';

export default defineConfig({
  testDir: './journeys',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 60_000,
  use: {
    baseURL,
    locale: 'he-IL',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'journeys',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/user.json',
      },
    },
  ],
});
```

- [ ] **Step 4: Install locally**

```bash
cd tests/e2e && npm install && npm run install:browsers
```

Expected: `chromium` downloaded, no errors.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/package.json tests/e2e/playwright.config.ts tests/e2e/.gitignore
git commit -m "test(e2e): scaffold Playwright package and config"
```

---

### Task 1.2: Auth setup project

**Files:**
- Create: `tests/e2e/auth.setup.ts`
- Modify: `app/apps/mobile/app/(auth)/sign-in.tsx`
- Modify: `app/apps/mobile/src/components/auth/AnimatedAuthInput.tsx`

- [ ] **Step 1: Add `testID` to `AnimatedAuthInput`**

In `AnimatedAuthInput.tsx`, extend props and pass to `TextInput`:

```typescript
interface AnimatedAuthInputProps extends TextInputProps {
  label: string;
  testID?: string;
}
// …
<TextInput testID={testID} … />
```

- [ ] **Step 2: Wire testIDs on sign-in screen**

In `sign-in.tsx`:

```tsx
<AnimatedAuthInput testID="auth-email" … />
<AnimatedAuthInput testID="auth-password" secureTextEntry … />
<TouchableOpacity testID="auth-submit" … onPress={handleSignIn}>
```

- [ ] **Step 3: Create `tests/e2e/auth.setup.ts`**

```typescript
import { test as setup, expect } from '@playwright/test';

const email = process.env.E2E_TEST_EMAIL;
const password = process.env.E2E_TEST_PASSWORD;

setup('authenticate', async ({ page }) => {
  if (!email || !password) {
    throw new Error('E2E_TEST_EMAIL and E2E_TEST_PASSWORD must be set');
  }
  await page.goto('/');
  // Welcome → email sign-in link (discover exact href once: /sign-in or similar)
  await page.getByRole('link', { name: /התחבר|כניסה/i }).first().click({ timeout: 15_000 }).catch(async () => {
    await page.goto('/sign-in');
  });
  await page.getByTestId('auth-email').fill(email);
  await page.getByTestId('auth-password').fill(password);
  await page.getByTestId('auth-submit').click();
  // Legal gate or feed — wait until authenticated shell
  await expect(page).not.toHaveURL(/\/\(auth\)/, { timeout: 30_000 });
  await page.context().storageState({ path: 'tests/e2e/.auth/user.json' });
});
```

- [ ] **Step 4: Run setup locally against dev**

```bash
export DEV_WEB_URL=https://mvp-2-dev.up.railway.app
export E2E_TEST_EMAIL=…
export E2E_TEST_PASSWORD=…
cd tests/e2e && DEV_WEB_URL=$DEV_WEB_URL E2E_TEST_EMAIL=$E2E_TEST_EMAIL E2E_TEST_PASSWORD=$E2E_TEST_PASSWORD npx playwright test auth.setup.ts --project=setup
```

Expected: `1 passed`, file `tests/e2e/.auth/user.json` created.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/auth.setup.ts app/apps/mobile/app/\(auth\)/sign-in.tsx app/apps/mobile/src/components/auth/AnimatedAuthInput.tsx
git commit -m "test(e2e): auth setup with testID hooks on sign-in"
```

---

### Task 1.3: P0 journey specs

**Files:**
- Create: `tests/e2e/journeys/feed.spec.ts`
- Create: `tests/e2e/journeys/post-write.spec.ts`
- Create: `tests/e2e/journeys/chat-inbox.spec.ts`
- Modify: feed + chat screens with minimal `testID`s

- [ ] **Step 1: Create `tests/e2e/journeys/feed.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test('home feed renders for authenticated user', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('feed-screen')).toBeVisible({ timeout: 20_000 });
  // At least one post card OR empty state — not error boundary
  const hasPosts = await page.getByTestId('feed-post-card').count();
  const hasEmpty = await page.getByTestId('feed-empty-state').isVisible().catch(() => false);
  expect(hasPosts > 0 || hasEmpty).toBeTruthy();
});
```

- [ ] **Step 2: Add `testID="feed-screen"`** on main feed route component (find `app/(tabs)/` or feed index — grep `FeedScreen` / feed route).

- [ ] **Step 3: Create `tests/e2e/journeys/post-write.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test('user can open create-post flow', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('feed-fab-create').click();
  await expect(page.getByTestId('create-post-screen')).toBeVisible();
  await page.getByTestId('create-post-title').fill('e2e smoke');
  await page.getByTestId('create-post-save-draft').click();
  await expect(page.getByText('e2e smoke')).toBeVisible({ timeout: 15_000 });
});
```

> Adjust selectors after locating create-post UI; use draft save to avoid publishing side effects if product allows.

- [ ] **Step 4: Create `tests/e2e/journeys/chat-inbox.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test('chat inbox opens', async ({ page }) => {
  await page.goto('/chat');
  await expect(page.getByTestId('chat-inbox-screen')).toBeVisible({ timeout: 20_000 });
});
```

- [ ] **Step 5: Run all journeys locally**

```bash
cd tests/e2e && DEV_WEB_URL=… E2E_TEST_EMAIL=… E2E_TEST_PASSWORD=… npm test
```

Expected: `4 passed` (setup + 3 journeys).

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/journeys/ app/apps/mobile/
git commit -m "test(e2e): P0 feed, create-post, and chat inbox journeys"
```

---

### Task 1.4: CI workflow + main gate

**Files:**
- Create: `.github/workflows/ci-e2e-dev.yml`
- Create: `scripts/wait-for-url.mjs`
- Modify: `docs/SSOT/RELEASE_CHECKLIST.md`
- Modify: `app/package.json`

- [ ] **Step 1: Create `scripts/wait-for-url.mjs`**

```javascript
#!/usr/bin/env node
const url = process.argv[2];
const maxAttempts = parseInt(process.argv[3] ?? '24', 10);
const delayMs = parseInt(process.argv[4] ?? '15000', 10);
if (!url) { console.error('usage: wait-for-url.mjs <url> [attempts] [delayMs]'); process.exit(2); }
(async () => {
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (res.ok) { console.log(`OK ${url} attempt ${i}`); process.exit(0); }
      console.log(`attempt ${i}/${maxAttempts}: HTTP ${res.status}`);
    } catch (e) { console.log(`attempt ${i}/${maxAttempts}: ${e.message}`); }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  console.error(`::error::${url} not ready`);
  process.exit(1);
})();
```

- [ ] **Step 2: Create `.github/workflows/ci-e2e-dev.yml`**

```yaml
name: CI — E2E dev

on:
  pull_request:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: ci-e2e-dev-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  user-journeys:
    name: user journeys (P0)
    if: github.event.pull_request.draft != true
    runs-on: ubuntu-latest
    timeout-minutes: 25
    steps:
      - uses: actions/checkout@v4

      - name: Require DEV_WEB_URL
        env:
          DEV_WEB_URL: ${{ vars.DEV_WEB_URL }}
        run: |
          test -n "$DEV_WEB_URL" || { echo "::error::Set DEV_WEB_URL variable"; exit 1; }

      - name: Wait for dev deployment
        env:
          DEV_WEB_URL: ${{ vars.DEV_WEB_URL }}
        run: node scripts/wait-for-url.mjs "${DEV_WEB_URL%/}/"

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install E2E deps
        working-directory: tests/e2e
        run: npm ci && npx playwright install --with-deps chromium

      - name: Run P0 journeys
        working-directory: tests/e2e
        env:
          DEV_WEB_URL: ${{ vars.DEV_WEB_URL }}
          E2E_TEST_EMAIL: ${{ secrets.E2E_TEST_EMAIL }}
          E2E_TEST_PASSWORD: ${{ secrets.E2E_TEST_PASSWORD }}
        run: npm test

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: tests/e2e/playwright-report/
```

- [ ] **Step 3: Update `RELEASE_CHECKLIST.md` merge gates table**

Add row:

| E2E dev | CI — E2E dev | `user journeys (P0)` |

Change "Dev smoke done" checkbox to: "Automated P0 E2E green (or documented exception for docs-only release)."

- [ ] **Step 4: Add root script in `app/package.json`**

```json
"test:e2e": "npm --prefix ../tests/e2e test",
"test:e2e:ui": "npm --prefix ../tests/e2e run test:ui"
```

- [ ] **Step 5: Operator — add required status check on `main`**

GitHub → Settings → Branches → `main` → require **CI — E2E dev / user journeys (P0)**.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/ci-e2e-dev.yml scripts/wait-for-url.mjs docs/SSOT/RELEASE_CHECKLIST.md app/package.json
git commit -m "ci(e2e): Playwright P0 journeys gate on dev → main release PRs"
```

---

### Task 1.5: Wave 1 verification

- [ ] **Step 1: Open test PR `dev` → `main`** (or dry-run `workflow_dispatch`)

Expected: E2E job runs, passes with green dev deployment.

- [ ] **Step 2: Flip `INFRA-QA-W1` → ✅ in `BACKLOG.md`**

---

## Wave 2 — E2E domain expansion

**Backlog ID:** `INFRA-QA-W2`  
**Duration:** ~2–3 weeks (incremental PRs)

Add one spec file per SSOT domain; prioritize by P0/P1 backlog.

| Spec domain | Journey file | Priority |
| --- | --- | --- |
| `04_posts.md` | `post-detail.spec.ts`, `closure.spec.ts` | P1 |
| `07_chat.md` | `chat-send.spec.ts` | P1 |
| `13_donations.md` | `donations-hub.spec.ts` | P2 |
| `16_public_research.md` | `research-anon.spec.ts` (no auth) | P1 |
| `12_super_admin.md` | `admin-reports.spec.ts` (behind env flag) | P2 |
| `01_auth_and_onboarding.md` | `guest-preview.spec.ts` | P2 |

### Task 2.1: Anonymous research form E2E

**Files:**
- Create: `tests/e2e/journeys/research-anon.spec.ts`

- [ ] **Step 1: Write spec** — `page.goto('/research/<known-slug>?src=e2e')`, fill required fields, submit, expect thank-you URL.

- [ ] **Step 2: Run against dev** — must not use auth project.

- [ ] **Step 3: Commit** — `test(e2e): anonymous research survey happy path`

### Task 2.2: Visual regression (optional)

**Files:**
- Modify: `tests/e2e/playwright.config.ts` — `expect.toHaveScreenshot` with `maxDiffPixels`

- [ ] **Step 1:** Snapshot welcome + feed empty state on CI with fixed viewport 390×844.

- [ ] **Step 2:** Store baselines in `tests/e2e/snapshots/` — review in PR.

> **YAGNI:** Only add screenshots for screens that broke twice in production.

---

## Wave 3 — Integration & RLS (`NFR-SEC-002`)

**Backlog ID:** `INFRA-QA-W3`  
**Duration:** ~1 week

### Task 3.1: Persona harness

**Files:**
- Create: `app/packages/infrastructure-supabase/src/security/__tests__/rlsPersonas.integration.test.ts`
- Create: `app/packages/infrastructure-supabase/src/security/__tests__/rlsPersonas.helpers.ts`

Pattern: copy `hardeningRpc.helpers.ts` — three personas:

| Persona | Description |
| --- | --- |
| `owner` | Post author |
| `follower` | Approved follower |
| `stranger` | No relationship |

- [ ] **Step 1: Write failing test** — stranger cannot `select` private post row via anon client.

- [ ] **Step 2: Run** — `cd app && pnpm --filter @kc/infrastructure-supabase test rlsPersonas`

Expected: PASS on dev DB env vars (skip if missing, same as existing integration tests).

- [ ] **Step 3: Add tables** — `posts`, `post_actor_identity`, `chat_messages` (minimum set from audit).

- [ ] **Step 4: Wire into `ci-backend.yml`** — job already runs local Supabase; ensure env exports `SUPABASE_*` for integration file.

---

## Wave 4 — Performance budgets (`NFR-PERF-*`)

**Backlog ID:** `INFRA-QA-W4`  
**Duration:** ~1–2 weeks

### Task 4.1: Lighthouse CI (Web cold start `NFR-PERF-001`)

**Files:**
- Create: `.github/workflows/ci-perf-budget.yml`
- Create: `tests/perf/lighthouse/budgets.json`

- [ ] **Step 1: Create `tests/perf/lighthouse/budgets.json`**

```json
{
  "ci": {
    "collect": {
      "url": ["${DEV_WEB_URL}/"],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "first-contentful-paint": ["error", { "maxNumericValue": 2000 }],
        "interactive": ["warn", { "maxNumericValue": 4000 }]
      }
    }
  }
}
```

- [ ] **Step 2: Workflow** — `schedule: cron: '0 6 * * *'` on `dev` + `workflow_dispatch`; **do not** block `main` until 5 consecutive green days.

### Task 4.2: k6 feed RPC (`NFR-PERF-002`, `NFR-PERF-010`)

**Files:**
- Create: `scripts/k6/feed-read.js`

- [ ] **Step 1: Script** — authenticate via Supabase REST with service role **only in CI secrets** for load harness OR use pre-issued JWT for E2E user.

- [ ] **Step 2: Thresholds** — `p(95) < 500` for `feed_ranked_ids` RPC.

- [ ] **Step 3: Gate promotion** — after 2 weeks of scheduled runs, add as required check on `main` release PR.

### Task 4.3: Playwright client timing (`NFR-PERF-002` client budget)

**Files:**
- Modify: `tests/e2e/journeys/feed.spec.ts`

- [ ] **Step 1: Add performance mark**

```typescript
test('feed first paint under 1200ms', async ({ page }) => {
  const t0 = Date.now();
  await page.goto('/');
  await expect(page.getByTestId('feed-screen')).toBeVisible();
  expect(Date.now() - t0).toBeLessThan(1200);
});
```

> Loosen threshold in CI (`2000`) vs local (`1200`) via `process.env.CI`.

---

## Wave 5 — Accessibility (`NFR-A11Y-*`)

**Backlog ID:** `INFRA-QA-W5`  
**Duration:** ~1 week

### Task 5.1: axe Playwright

**Files:**
- Create: `.github/workflows/ci-a11y.yml`
- Create: `tests/e2e/journeys/a11y-critical.spec.ts`

- [ ] **Step 1: Install `@axe-core/playwright` in `tests/e2e/package.json`**

- [ ] **Step 2: Scan routes** — `/`, `/(auth)/sign-in`, `/settings`, `/chat` after auth setup.

- [ ] **Step 3: Fail on serious/critical violations only** (document exceptions in `TESTING.md`).

---

## Wave 6 — Native E2E (Maestro)

**Backlog ID:** `INFRA-QA-W6`  
**Duration:** ~2 weeks (parallel track, not blocking Web releases)

### Task 6.1: Maestro scaffold

**Files:**
- Create: `tests/maestro/README.md`
- Create: `tests/maestro/flows/auth-email.yaml`
- Create: `.github/workflows/ci-maestro-ios.yml` (macos runner, `workflow_dispatch` + nightly)

- [ ] **Step 1: Document** — requires Expo dev build or EAS build with `EXPO_PUBLIC_DEV_AUTO_SIGN_IN` **disabled**; Maestro drives UI.

- [ ] **Step 2: iOS flow** — launch app → sign in → feed visible.

- [ ] **Step 3: Do not add to `main` required checks** until 10 consecutive nightly greens.

---

## Wave 7 — Prod synthetics & monitoring

**Backlog ID:** `INFRA-QA-W7`  
**Duration:** ongoing

### Task 7.1: Expand `prod-smoke.yml`

**Files:**
- Modify: `.github/workflows/prod-smoke.yml`
- Create: `tests/e2e/journeys/prod-health.spec.ts` (read-only, no writes)

- [ ] **Step 1: After HTTP 200, run** — anonymous load `/`, guest preview CTA visible, no dev banner (`EXPO_PUBLIC_ENVIRONMENT=production`).

- [ ] **Step 2: Secrets** — use `PROD_WEB_URL` only; no prod write credentials.

### Task 7.2: Realtime probe (`NFR-PERF-005`)

**Files:**
- Create: `scripts/realtime-probe.mjs` — cron every 5 min on dev (GitHub scheduled workflow).

- [ ] **Step 1:** Subscribe to channel, publish test event via service role, measure round-trip < 2000ms.

---

## CI gate summary (final)

| Branch / event | Unit + lint | E2E P0 | Perf | A11y | Maestro |
| --- | --- | --- | --- | --- | --- |
| PR → `dev` | ✅ required | optional (Wave 2+) | scheduled | path-filter | nightly |
| PR → `main` | ✅ required | ✅ required | warn → ✅ | path-filter | nightly |
| push `main` | ✅ | prod-health read-only | scheduled | — | — |

---

## Self-review (plan author checklist)

| Check | Result |
| --- | --- |
| Spec coverage: `RELEASE_CHECKLIST` dev smoke | Wave 1 Tasks 1.3–1.4 |
| `NFR-PERF-001..010` | Wave 4 |
| `NFR-A11Y-001..010` | Wave 5 (critical routes first) |
| `NFR-SEC-002` RLS fuzzer | Wave 3 |
| `07_acceptance.md` E2E happy path | Wave 1 P0 |
| Placeholder scan | No TBD steps in Waves 0–1 |
| Type/name consistency | `testID` / `DEV_WEB_URL` / `E2E_TEST_*` used throughout |

**Gaps intentionally deferred:** full WCAG audit on every screen, Google SSO E2E, push deliverability (`NFR-PERF-009`) — require provider dashboards, not Playwright.

---

## Estimated timeline

| Wave | Calendar (1 dev/agent) | Cumulative capability |
| --- | --- | --- |
| 0 | 1 day | Policy + accounts |
| 1 | 3–5 days | **Release blocked without P0 E2E** |
| 2 | 2–3 weeks | Domain coverage |
| 3 | 1 week | RLS personas in CI |
| 4 | 1–2 weeks | Perf budgets (scheduled → gate) |
| 5 | 1 week | a11y on critical paths |
| 6 | 2 weeks | iOS Maestro nightly |
| 7 | ongoing | Prod synthetics |

**Total to "comprehensive + professional" for Web release path:** ~6–8 weeks incremental. Native parity adds ~2 weeks.

---

## Risk register

| Risk | Mitigation |
| --- | --- |
| Flaky E2E on live dev | `retries: 2`, fixed seed user, `wait-for-url`, quarantine protocol in `TESTING.md` |
| Email verification gate blocks login | E2E user must be `active` in dev; document in Wave 0 |
| Legal consent screen after login | Extend `auth.setup.ts` to click accept if `legal-consent` route appears |
| CI time + cost | E2E only on `main` PR initially; parallelize domains in Wave 2 |
| false confidence | Keep unit + RLS tests; E2E does not replace migration safety scans |
