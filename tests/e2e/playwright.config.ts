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
      testIgnore: /auth\.setup\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user.json',
      },
    },
  ],
});
