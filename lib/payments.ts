/**
 * Payment seam for the public pricing page.
 *
 * Packages are the source of truth in the DB (services toggled "Include on
 * Pricing Page", served by GET /api/pricing/packages). This module turns a
 * package into a pay link + label and centralizes the Venmo → Stripe switch.
 *
 * TO ADD STRIPE: create a Payment Link per package, put its URL in
 * STRIPE_PAYMENT_LINKS keyed by the package (service) id, and set
 * NEXT_PUBLIC_PAYMENTS_PROVIDER=stripe. Any package without a link falls back
 * to Venmo, so rollout can be one package at a time.
 */
import type { PublicPricingPackage } from '@/lib/api/pricing';

export type PaymentProvider = 'venmo' | 'stripe';

/** Active provider. Defaults to Venmo until Stripe links are configured. */
export const PAYMENTS_PROVIDER: PaymentProvider =
  (process.env.NEXT_PUBLIC_PAYMENTS_PROVIDER as PaymentProvider) || 'venmo';

export const VENMO_HANDLE = 'dtspbjj';
export const ZELLE_NUMBER_RAW = '7274002225';
export const ZELLE_NUMBER_DISPLAY = '(727) 400-2225';

/** Stripe Payment Link per package (keyed by service id). Empty until live. */
export const STRIPE_PAYMENT_LINKS: Record<string, string> = {};

/** Amount to charge: the monthly bundle if present, else the per-session price. */
export function packageAmountUsd(pkg: PublicPricingPackage): number {
  const cents = pkg.monthly_price_cents ?? pkg.default_price_cents;
  return Math.round(cents) / 100;
}

/** Headline price label, e.g. "$680". */
export function packagePriceLabel(pkg: PublicPricingPackage): string {
  const amt = packageAmountUsd(pkg);
  return `$${amt % 1 === 0 ? amt.toFixed(0) : amt.toFixed(2)}`;
}

/** "per month" for a bundle, "per session" for a drop-in / single session. */
export function packagePriceUnit(pkg: PublicPricingPackage): string {
  return pkg.monthly_price_cents != null ? 'per month' : 'per session';
}

/** Secondary per-session line when the headline is a monthly bundle. */
export function packagePerSessionLabel(
  pkg: PublicPricingPackage,
): string | null {
  if (pkg.monthly_price_cents == null) return null;
  return `$${(pkg.default_price_cents / 100).toFixed(0)} per session`;
}

/** Note pre-filled into the payment (Venmo) so the coach sees what was bought. */
export function packageNote(pkg: PublicPricingPackage): string {
  const cadence = pkg.cadence_label ? ` (${pkg.cadence_label})` : '';
  const spm = pkg.sessions_per_month
    ? ` — ${pkg.sessions_per_month} sessions/month`
    : '';
  return `${pkg.name}${cadence}${spm}`;
}

function venmoPayHref(amountUsd: number, note: string): string {
  const params = new URLSearchParams({
    txn: 'pay',
    audience: 'private',
    recipients: VENMO_HANDLE,
    amount: String(amountUsd),
    note,
  });
  return `https://venmo.com/?${params.toString()}`;
}

/**
 * Checkout URL for a package, routed through the active provider. Stripe wins
 * only when the provider is 'stripe' AND a Payment Link exists; else Venmo.
 * The ONE place a new provider is wired in.
 */
export function getCheckoutHref(pkg: PublicPricingPackage): string {
  if (PAYMENTS_PROVIDER === 'stripe') {
    const link = STRIPE_PAYMENT_LINKS[pkg.id];
    if (link) return link;
  }
  return venmoPayHref(packageAmountUsd(pkg), packageNote(pkg));
}

/** Button label for a package, matching whichever provider handles it. */
export function getCheckoutLabel(pkg: PublicPricingPackage): string {
  const usingStripe =
    PAYMENTS_PROVIDER === 'stripe' && Boolean(STRIPE_PAYMENT_LINKS[pkg.id]);
  const price = packagePriceLabel(pkg);
  return usingStripe ? `Pay ${price}` : `Pay ${price} with Venmo`;
}
