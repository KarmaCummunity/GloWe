import { defineConfig, devices } from '@playwright/test';

const baseURL = (process.env.DEV_WEB_URL ?? 'http://127.0.0.1:8765').replace(/\/$/, '');

export default defineConfig({
  testDir: './journeys',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 90_000,
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}{ext}',
  expect: {
    timeout: process.env.CI ? 30_000 : 15_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.04,
      animations: 'disabled',
    },
  },
  use: {
    baseURL,
    locale: 'he-IL',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Sandboxed/remote environments ship a pinned Chromium instead of the
    // Playwright-managed download; point at it via env when needed.
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } }
      : {}),
  },
  projects: [
    {
      name: 'setup',
      testMatch: /(^|\/)auth\.setup\.ts/,
    },
    {
      name: 'journeys',
      testIgnore: /auth\.setup\.ts|glowe-/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user.json',
      },
    },
    // GloWe suite (FR-GLOWE-*): runs against DEV_WEB_URL + /glowe (or a local
    // static server via GLOWE_WEB_URL). Signed-in specs consume per-persona
    // storage states minted by glowe-auth.setup.ts and skip when the dev seed
    // (scripts/seed-glowe-dev.mjs) has not run.
    {
      name: 'glowe-setup',
      testMatch: /glowe-auth\.setup\.ts/,
    },
    {
      name: 'glowe',
      testMatch: /glowe-.*\.spec\.ts/,
      // Local-only mock-login is a separate project (requires :4321 + local Supabase).
      // Visual has its own project so a journey failure does not skip screenshots.
      testIgnore: /prod-health\.spec\.ts|glowe-visual\.spec\.ts|glowe-local-dev-login\.spec\.ts/,
      dependencies: ['glowe-setup'],
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    // Local Supabase + mock-login personas only. Never runs in hosted CI.
    {
      name: 'glowe-local',
      testMatch: /glowe-local-dev-login\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    // Visual regression — guest-only, no seed dependency. Runs in CI against
    // GLOWE_STAGING_URL (PRs) or GLOWE_PROD_URL (release gate).
    {
      name: 'glowe-visual',
      testMatch: /glowe-visual\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 900 },
      },
    },
    // Read-only GloWe live-site synthetics (INFRA-QA-W7). Uses GLOWE_PROD_URL
    // (https://dev.karma-community.pages.dev/glowe); no auth setup.
    {
      name: 'prod-health',
      testMatch: /prod-health\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
