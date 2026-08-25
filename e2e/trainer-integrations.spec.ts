// @ts-nocheck — PENDING HARNESS: remove once @playwright/test is installed.
/**
 * Trainer integrations page (app/trainer/settings/integrations/page.tsx):
 * Google Calendar connect / claim redemption + push toggle surface.
 *
 * AUTH NOTE: /trainer/* is gated by middleware.ts (Supabase session cookie
 * with app_metadata.user_role === 'trainer'). Provide a signed-in trainer
 * session via `E2E_TRAINER_STORAGE_STATE=<path to storageState.json>`
 * (see the sanctioned local test-auth stub). Without it these tests skip —
 * they never fake the role client-side, because the middleware being
 * un-bypassable is itself part of what we're protecting.
 */
import { test, expect, API_ORIGIN } from './fixtures';

const STORAGE_STATE = process.env.E2E_TRAINER_STORAGE_STATE;

test.describe('trainer integrations', () => {
  test.skip(!STORAGE_STATE, 'E2E_TRAINER_STORAGE_STATE not set — needs a trainer session');
  test.use({ storageState: STORAGE_STATE });

  test.beforeEach(async ({ page }) => {
    await page.route(`${API_ORIGIN}/api/integrations/status`, (route) =>
      route.fulfill({
        json: { google_calendar_connected: false, google_calendar_id: null },
      }),
    );
  });

  test('Connect button calls oauth/start and navigates to the returned auth_url', async ({
    page,
  }) => {
    let startCalled = false;
    await page.route(`${API_ORIGIN}/api/integrations/google/oauth/start`, (route) => {
      startCalled = true;
      expect(route.request().method()).toBe('POST');
      return route.fulfill({ json: { auth_url: `${API_ORIGIN}/e2e-google-consent` } });
    });
    await page.route(`${API_ORIGIN}/e2e-google-consent`, (route) =>
      route.fulfill({ contentType: 'text/html', body: '<h1>Google consent</h1>' }),
    );

    await page.goto('/trainer/settings/integrations');
    await page.getByRole('button', { name: 'Connect Google Calendar' }).click();

    await expect(page.getByText('Google consent')).toBeVisible();
    expect(startCalled).toBe(true);
  });

  test('gcal=pending&claim=… redeems the claim exactly once and strips the query', async ({
    page,
  }) => {
    let claimBody: unknown = null;
    let claimCalls = 0;
    await page.route(`${API_ORIGIN}/api/integrations/google/oauth/claim`, (route) => {
      claimCalls += 1;
      claimBody = route.request().postDataJSON();
      return route.fulfill({ json: { google_email: 'coach@example.com' } });
    });

    await page.goto('/trainer/settings/integrations?gcal=pending&claim=one-time-claim-xyz');

    await expect(
      page.getByText('Google Calendar connected as coach@example.com'),
    ).toBeVisible();
    expect(claimCalls).toBe(1);
    expect(JSON.stringify(claimBody)).toContain('one-time-claim-xyz');
    // One-time claim must not survive in the URL (refresh would re-redeem).
    await expect(page).toHaveURL(/\/trainer\/settings\/integrations$/);
  });

  test('gcal error outcomes surface the designed toast, no crash', async ({ page }) => {
    await page.goto('/trainer/settings/integrations?gcal=state_invalid');
    await expect(page.getByText('Connection link expired — try again')).toBeVisible();
  });

  test('backend down shows error state instead of a blank page', async ({ page }) => {
    await page.unroute(`${API_ORIGIN}/api/integrations/status`);
    await page.route(`${API_ORIGIN}/api/integrations/status`, (route) =>
      route.abort('connectionrefused'),
    );

    await page.goto('/trainer/settings/integrations');

    // The page renders its error banner (describeApiError output), never a
    // blank screen.
    await expect(page.locator('p.text-destructive')).toBeVisible();
  });
});

test.describe('trainer integrations — auth gate', () => {
  test('unauthenticated visit redirects to login, never renders the page', async ({
    page,
  }) => {
    await page.goto('/trainer/settings/integrations');
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
