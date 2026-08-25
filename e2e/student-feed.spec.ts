// @ts-nocheck — PENDING HARNESS: remove once @playwright/test is installed.
/**
 * Student feed (app/student/feed/page.tsx + components/student/clip-feed.tsx):
 * empty state, populated state, and backend-down error state.
 *
 * AUTH NOTE: /student/* is middleware-gated (Supabase session with
 * app_metadata.user_role === 'student'). Provide
 * `E2E_STUDENT_STORAGE_STATE=<path to storageState.json>`; without it the
 * authed tests skip. The redirect test runs regardless.
 */
import { test, expect, API_ORIGIN } from './fixtures';

const STORAGE_STATE = process.env.E2E_STUDENT_STORAGE_STATE;
const FEED_URL = `${API_ORIGIN}/api/student/feed*`;

test.describe('student feed', () => {
  test.skip(!STORAGE_STATE, 'E2E_STUDENT_STORAGE_STATE not set — needs a student session');
  test.use({ storageState: STORAGE_STATE });

  test('empty feed shows the designed empty state', async ({ page }) => {
    await page.route(FEED_URL, (route) =>
      route.fulfill({ json: { items: [], next_cursor: null } }),
    );

    await page.goto('/student/feed');

    await expect(page.getByText('Nothing in your feed yet')).toBeVisible();
    await expect(
      page.getByText("Your coach hasn't logged a session yet", { exact: false }),
    ).toBeVisible();
  });

  test('feed with one clip renders a card, no empty state', async ({ page }) => {
    await page.route(FEED_URL, (route) =>
      route.fulfill({
        json: {
          // Shape: lib/types.ts FeedItem.
          items: [
            {
              delivery_id: 'del_1',
              delivered_at: '2026-08-20T18:00:00Z',
              fight: {
                youtube_id: 'dQw4w9WgXcQ',
                title: 'Check-hook counter breakdown',
                event: 'UFC 300',
                fighters: ['Fighter A', 'Fighter B'],
              },
              technique: { name: 'check_hook', display_name: 'Check hook' },
              timestamp_start_seconds: 61,
              timestamp_end_seconds: 90,
              delivery_message: 'Watch the lead-hand pivot.',
              session_reference: null,
            },
          ],
          next_cursor: null,
        },
      }),
    );

    await page.goto('/student/feed');

    await expect(page.getByText('Check-hook counter breakdown')).toBeVisible();
    await expect(page.getByText('Check hook')).toBeVisible();
    await expect(page.getByText('Nothing in your feed yet')).toHaveCount(0);
  });

  test('backend down shows the error banner, not a blank screen', async ({ page }) => {
    await page.route(FEED_URL, (route) => route.abort('connectionrefused'));

    await page.goto('/student/feed');

    await expect(page.locator('div.text-destructive')).toBeVisible();
  });
});

test.describe('student feed — auth gate', () => {
  test('unauthenticated visit redirects to login', async ({ page }) => {
    await page.goto('/student/feed');
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
