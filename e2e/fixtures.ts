// @ts-nocheck — PENDING HARNESS: remove this line (here and in every spec)
// once `pnpm add -D @playwright/test` lands. Without the dep, tsconfig's
// `**/*.ts` include would otherwise fail `tsc --noEmit` on the import below.
/**
 * Shared fixtures + API mocks for the e2e suite.
 *
 * The frontend talks to the FastAPI backend at NEXT_PUBLIC_API_URL
 * (http://localhost:8010 locally). Specs intercept that origin so they run
 * hermetically — no backend, no Supabase, no Stripe.
 */
import { test as base } from '@playwright/test';

export const API_ORIGIN = process.env.E2E_API_ORIGIN ?? 'http://localhost:8010';

/** Canonical InvoicePublicPayload (lib/api/billing.ts) for a sent invoice. */
export function makePublicInvoicePayload(overrides: Record<string, unknown> = {}) {
  return {
    invoice: {
      id: 'inv_e2e_1',
      invoice_number: 'FT-1001',
      description: 'Muay Thai — 4 session block',
      amount_cents: 32000,
      amount_paid_cents: 0,
      amount_due_cents: 32000,
      currency: 'USD',
      due_date: '2026-09-01',
      status: 'sent',
      notes: null,
      ...((overrides.invoice as Record<string, unknown>) ?? {}),
    },
    student: { name: 'Jordan Diaz', email: 'jordan@example.com' },
    trainer: {
      tenant_name: 'Southpaw Striking',
      payment_instructions: 'Venmo preferred. Zelle works too.',
    },
    payment_methods: {
      venmo: {
        web_url: 'https://venmo.com/southpaw?txn=pay&amount=320.00',
        app_url: 'venmo://paycharge?txn=pay&recipients=southpaw&amount=320.00',
        handle: 'southpaw',
      },
      zelle: {
        phone: '+15555550123',
        email: null,
        display_name: 'Southpaw Striking LLC',
        amount_dollars: '320.00',
        tel_href: 'tel:+15555550123',
      },
    },
    ...overrides,
  };
}

export const test = base;
export { expect } from '@playwright/test';
