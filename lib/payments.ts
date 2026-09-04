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

// WP-08: the Venmo/Zelle identity is NOT a constant here. It comes from the
// tenant settings row the coach edits, via GET /api/pricing/payment-methods.
// Hardcoding it made that settings page a lie and created a second source of
// truth. The builders below take the handle as a parameter and stay pure.

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

function venmoPayHref(
  venmoHandle: string,
  amountUsd: number,
  note: string,
): string {
  const params = new URLSearchParams({
    txn: 'pay',
    audience: 'private',
    recipients: venmoHandle,
    amount: String(amountUsd),
    note,
  });
  return `https://venmo.com/?${params.toString()}`;
}

/** Venmo profile deep link, or null when the tenant has no handle configured. */
export function venmoProfileHref(venmoHandle: string | null): string | null {
  return venmoHandle ? `https://venmo.com/u/${venmoHandle}` : null;
}

/**
 * "(727) 400-2225" from "7274002225". Falls back to the raw string for
 * anything that is not a 10-digit US number, so an international or
 * already-formatted value is shown as the coach entered it.
 */
export function formatZellePhone(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return raw;
}

/**
 * Checkout URL for a package, routed through the active provider. Stripe wins
 * only when the provider is 'stripe' AND a Payment Link exists; else Venmo.
 * The ONE place a new provider is wired in.
 */
export function getCheckoutHref(
  pkg: PublicPricingPackage,
  venmoHandle: string | null,
): string | null {
  if (PAYMENTS_PROVIDER === 'stripe') {
    const link = STRIPE_PAYMENT_LINKS[pkg.id];
    if (link) return link;
  }
  // No configured handle means no payable link. Returning null lets the caller
  // render a disabled control instead of a Venmo URL that pays nobody.
  if (!venmoHandle) return null;
  return venmoPayHref(venmoHandle, packageAmountUsd(pkg), packageNote(pkg));
}

/** Button label for a package, matching whichever provider handles it. */
export function getCheckoutLabel(
  pkg: PublicPricingPackage,
  venmoHandle: string | null,
): string {
  const usingStripe =
    PAYMENTS_PROVIDER === 'stripe' && Boolean(STRIPE_PAYMENT_LINKS[pkg.id]);
  const price = packagePriceLabel(pkg);
  if (usingStripe) return `Pay ${price}`;
  return venmoHandle ? `Pay ${price} with Venmo` : price;
}
