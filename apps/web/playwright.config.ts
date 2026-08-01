import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the HSC Study Tracker e2e suite.
 *
 * The timer-persistence spec drives the dev-only `/__test/timer` route so
 * it doesn't need a real Google sign-in. Other specs (subscribe, syllabus)
 * will be added in later sessions.
 *
 * Run locally: `npm run test:e2e`
 *   requires `npm run dev` in another shell on port 5173
 *   with VITE_ENABLE_TEST_ROUTES=true set.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --mode test',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
