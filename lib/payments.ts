/**
 * Payments — single source of truth for coaching tiers and how each one is
 * paid. Structured so Stripe can be dropped in later with NO page changes.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * TO ADD STRIPE LATER (nothing here needs restructuring):
 *
 *   1. In the Stripe dashboard create one Payment Link per tier below, using
 *      the tier `id` as the product/lookup reference so they map 1:1.
 *   2. Paste each Payment Link URL into STRIPE_PAYMENT_LINKS keyed by tier id.
 *   3. Set NEXT_PUBLIC_PAYMENTS_PROVIDER=stripe (env). Any tier missing a link
 *      transparently falls back to Venmo, so you can roll out tier by tier.
 *
 * That's it — `getCheckoutHref()` already routes through the provider, and the
 * button label already follows via `getCheckoutLabel()`. No component edits.
 *
 * (If you later want dynamic per-customer Stripe Checkout Sessions instead of
 * static Payment Links, replace the STRIPE branch in getCheckoutHref with a
 * call to a backend `/api/checkout` route — the seam is the same function.)
 * ─────────────────────────────────────────────────────────────────────────
 */

export type SessionLength = '1-Hour' | '30-Minute';

export type TierId =
  | '1h-drop-in'
  | '1h-weekly'
  | '1h-2x'
  | '1h-3x'
  | '30m-2x'
  | '30m-3x';

export type PricingTier = {
  id: TierId; // stable — Stripe products/links key off this
  sessionLength: SessionLength;
  name: string;
  cadence: string; // e.g. "2x per week"
  sessions: string; // e.g. "8 sessions per month"
  amountUsd: number; // numeric charge amount (source of truth)
  price: string; // display headline, e.g. "$680"
  priceUnit: string; // "per month" | "per session"
  perSession: string | null; // secondary per-session display line
  popular?: boolean;
};

export const ONE_HOUR_TIERS: PricingTier[] = [
  {
    id: '1h-drop-in',
    sessionLength: '1-Hour',
    name: 'Drop-In',
    cadence: 'Single session',
    sessions: '1 session',
    amountUsd: 100,
    price: '$100',
    priceUnit: 'per session',
    perSession: '$100 per session',
  },
  {
    id: '1h-weekly',
    sessionLength: '1-Hour',
    name: 'Weekly',
    cadence: '1x per week',
    sessions: '4 sessions per month',
    amountUsd: 360,
    price: '$360',
    priceUnit: 'per month',
    perSession: '$90 per session',
  },
  {
    id: '1h-2x',
    sessionLength: '1-Hour',
    name: 'Twice Weekly',
    cadence: '2x per week',
    sessions: '8 sessions per month',
    amountUsd: 680,
    price: '$680',
    priceUnit: 'per month',
    perSession: '$85 per session',
    popular: true,
  },
  {
    id: '1h-3x',
    sessionLength: '1-Hour',
    name: 'Three Times Weekly',
    cadence: '3x per week',
    sessions: '12 sessions per month',
    amountUsd: 960,
    price: '$960',
    priceUnit: 'per month',
    perSession: '$80 per session',
  },
];

// NOTE: 30-minute monthly totals are transcribed exactly from the price sheet
// ($408 / $576) alongside the sheet's per-session figures ($55 / $50); the two
// are not arithmetically consistent on the sheet and are shown as printed.
export const THIRTY_MIN_TIERS: PricingTier[] = [
  {
    id: '30m-2x',
    sessionLength: '30-Minute',
    name: 'Twice Weekly',
    cadence: '2x per week',
    sessions: '8 sessions per month',
    amountUsd: 408,
    price: '$408',
    priceUnit: 'per month',
    perSession: '$55 per session',
    popular: true,
  },
  {
    id: '30m-3x',
    sessionLength: '30-Minute',
    name: 'Three Times Weekly',
    cadence: '3x per week',
    sessions: '12 sessions per month',
    amountUsd: 576,
    price: '$576',
    priceUnit: 'per month',
    perSession: '$50 per session',
  },
];

// ---------------------------------------------------------------------------
// Payment provider seam
// ---------------------------------------------------------------------------

export type PaymentProvider = 'venmo' | 'stripe';

/** Active provider. Defaults to Venmo until Stripe links are configured. */
export const PAYMENTS_PROVIDER: PaymentProvider =
  (process.env.NEXT_PUBLIC_PAYMENTS_PROVIDER as PaymentProvider) || 'venmo';

export const VENMO_HANDLE = 'dtspbjj';
export const ZELLE_NUMBER_RAW = '7274002225';
export const ZELLE_NUMBER_DISPLAY = '(727) 400-2225';

/**
 * Stripe Payment Link per tier. EMPTY today — fill in when Stripe goes live.
 * A tier without an entry falls back to Venmo automatically.
 */
export const STRIPE_PAYMENT_LINKS: Partial<Record<TierId, string>> = {
  // '1h-2x': 'https://buy.stripe.com/xxxxxxxx',
};

/** Build a Venmo deep link with recipient, amount, and note pre-filled. */
export function venmoPayHref(amountUsd: number, note: string): string {
  const params = new URLSearchParams({
    txn: 'pay',
    audience: 'private',
    recipients: VENMO_HANDLE,
    amount: String(amountUsd),
    note,
  });
  return `https://venmo.com/?${params.toString()}`;
}

/** Human-readable note attached to a tier's payment. */
export function tierNote(tier: PricingTier): string {
  return `${tier.sessionLength} ${tier.name} (${tier.cadence}) — ${tier.sessions}`;
}

/**
 * The checkout URL for a tier, routed through the active provider. Stripe wins
 * only when the provider is 'stripe' AND a Payment Link exists for the tier;
 * otherwise Venmo. This is the ONE place a new provider is wired in.
 */
export function getCheckoutHref(tier: PricingTier): string {
  if (PAYMENTS_PROVIDER === 'stripe') {
    const link = STRIPE_PAYMENT_LINKS[tier.id];
    if (link) return link;
  }
  return venmoPayHref(tier.amountUsd, tierNote(tier));
}

/** Button label for a tier, matching whichever provider will handle it. */
export function getCheckoutLabel(tier: PricingTier): string {
  const usingStripe =
    PAYMENTS_PROVIDER === 'stripe' && Boolean(STRIPE_PAYMENT_LINKS[tier.id]);
  return usingStripe ? `Pay ${tier.price}` : `Pay ${tier.price} with Venmo`;
}
