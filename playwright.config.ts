// @ts-nocheck — PENDING HARNESS: @playwright/test is NOT yet installed;
// without this directive `tsc --noEmit` fails with TS2307 on the import
// below (tsconfig's `**/*.ts` include covers this file and e2e/).
/**
 * PENDING HARNESS — @playwright/test is NOT yet a dependency of this repo.
 *
 * Authored by the phase-gate frontend QA pass so the harness is one command
 * away. To activate:
 *
 *   pnpm add -D @playwright/test && pnpm exec playwright install chromium
 *   pnpm exec playwright test
 *
 * Then remove the @ts-nocheck directive above.
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
