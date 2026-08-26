// @ts-nocheck — PENDING HARNESS: remove once @playwright/test is installed.
/**
 * Public invoice page (app/invoice/[token]/page.tsx) — the highest-risk
 * touched flow: unauthenticated, money-adjacent, Stripe hand-off.
 *
 * All backend calls are intercepted at API_ORIGIN, so this suite runs with
 * no backend and no Stripe keys.
 */
import { test, expect, API_ORIGIN, makePublicInvoicePayload } from './fixtures';

const TOKEN = 'e2e-token-abc123';
const INVOICE_URL = `${API_ORIGIN}/api/invoices/public/${TOKEN}`;
const CHECKOUT_URL = `${API_ORIGIN}/api/invoices/public/${TOKEN}/checkout`;

test.describe('public invoice — happy path', () => {
  test('renders server-provided amount, status, and payment options', async ({ page }) => {
    await page.route(INVOICE_URL, (route) =>
      route.fulfill({ json: makePublicInvoicePayload() }),
    );

    await page.goto(`/invoice/${TOKEN}`);

    // Amount and status must be exactly what the server sent — the client
    // never computes money.
    await expect(page.getByText('$320.00', { exact: true })).toBeVisible();
    await expect(page.getByText('sent', { exact: true })).toBeVisible();
    await expect(page.getByText('Muay Thai — 4 session block')).toBeVisible();
    await expect(page.getByText('Hi Jordan,')).toBeVisible();

    // All three payment paths offered for an unpaid invoice.
    await expect(page.getByRole('button', { name: 'Pay online' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open Venmo app' })).toBeVisible();
    await expect(page.getByText('+15555550123')).toBeVisible();
  });

  test('Pay online calls the checkout endpoint and navigates to the returned URL', async ({
    page,
  }) => {
    await page.route(INVOICE_URL, (route) =>
      route.fulfill({ json: makePublicInvoicePayload() }),
    );
    let checkoutCalled = false;
    await page.route(CHECKOUT_URL, (route) => {
      checkoutCalled = true;
      expect(route.request().method()).toBe('POST');
      return route.fulfill({
        json: {
          checkout_url: `${API_ORIGIN}/e2e-stripe-checkout`,
          session_id: 'cs_test_e2e',
          amount_cents: 32000,
        },
      });
    });
    // Stand-in for the Stripe-hosted page the browser is sent to.
    await page.route(`${API_ORIGIN}/e2e-stripe-checkout`, (route) =>
      route.fulfill({ contentType: 'text/html', body: '<h1>Stripe checkout</h1>' }),
    );

    await page.goto(`/invoice/${TOKEN}`);
    await page.getByRole('button', { name: 'Pay online' }).click();

    await expect(page.getByText('Stripe checkout')).toBeVisible();
    expect(checkoutCalled).toBe(true);
  });

  test('paid invoice shows Paid in full and hides every pay CTA', async ({ page }) => {
    await page.route(INVOICE_URL, (route) =>
      route.fulfill({
        json: makePublicInvoicePayload({
          invoice: {
            status: 'paid',
            amount_paid_cents: 32000,
            amount_due_cents: 0,
          },
        }),
      }),
    );

    await page.goto(`/invoice/${TOKEN}`);

    await expect(page.getByText('Paid in full')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pay online' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Open Venmo app' })).toHaveCount(0);
  });

  test('?paid=1 return from Stripe toasts success and refetches the invoice', async ({
    page,
  }) => {
    let calls = 0;
    await page.route(INVOICE_URL, (route) => {
      calls += 1;
      // First fetch: still unpaid (webhook not settled). Refetches: paid.
      const paid = calls > 1;
      return route.fulfill({
        json: makePublicInvoicePayload(
          paid
            ? { invoice: { status: 'paid', amount_paid_cents: 32000, amount_due_cents: 0 } }
            : {},
        ),
      });
    });

    await page.goto(`/invoice/${TOKEN}?paid=1`);

    await expect(page.getByText('Payment received — thanks!')).toBeVisible();
    // The 2.5s refetch flips the on-screen state to paid.
    await expect(page.getByText('Paid in full')).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('public invoice — failure paths', () => {
  test('bad token shows the designed not-found state, not a crash', async ({ page }) => {
    await page.route(INVOICE_URL, (route) =>
      route.fulfill({
        status: 404,
        json: { detail: { code: 'INVOICE_NOT_FOUND', message: 'Invoice not found' } },
      }),
    );

    await page.goto(`/invoice/${TOKEN}`);

    await expect(page.getByText('Invoice not found')).toBeVisible();
    await expect(page.getByText('Ask your coach to resend the link.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pay online' })).toHaveCount(0);
  });

  test('backend down shows error state, not a blank screen', async ({ page }) => {
    await page.route(INVOICE_URL, (route) => route.abort('connectionrefused'));

    await page.goto(`/invoice/${TOKEN}`);

    await expect(page.getByText('Invoice not found')).toBeVisible();
  });

  test('Stripe unconfigured hides card CTA and keeps Venmo/Zelle working', async ({
    page,
  }) => {
    await page.route(INVOICE_URL, (route) =>
      route.fulfill({ json: makePublicInvoicePayload() }),
    );
    await page.route(CHECKOUT_URL, (route) =>
      route.fulfill({
        status: 503,
        json: {
          detail: { code: 'STRIPE_NOT_CONFIGURED', message: 'Online payment unavailable' },
        },
      }),
    );

    await page.goto(`/invoice/${TOKEN}`);
    await page.getByRole('button', { name: 'Pay online' }).click();

    await expect(page.getByText('Online payment isn’t enabled')).toBeVisible();
    // CTA removed; fallback rails remain.
    await expect(page.getByRole('button', { name: 'Pay online' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Open Venmo app' })).toBeVisible();
  });
});
