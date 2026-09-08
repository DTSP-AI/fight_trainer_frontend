/**
 * PENDING HARNESS — @playwright/test is NOT yet a dependency of this repo.
 *
 * Until the harness lands, this file and e2e/ are excluded from tsconfig.json
 * (and from ESLint) so `tsc --noEmit` does not fail with TS2307 on the import
 * below. To activate:
 *
 *   pnpm add -D @playwright/test && pnpm exec playwright install chromium
 *   pnpm exec playwright test
 *
 * Then drop "playwright.config.ts" and "e2e/**" from tsconfig.json's exclude
 * list and from the ignores in eslint.config.mjs.
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = 3010;
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Project law is mobile-first for student-facing surfaces — re-run at
    // a phone viewport.
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: `pnpm exec next dev -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
