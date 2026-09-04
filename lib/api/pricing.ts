/**
 * Public pricing packages — drives the marketing /pricing page from the brand
 * tenant's services that are toggled "Include on Pricing Page". No auth.
 *
 * Server-safe: fetches directly (not through the client apiClient, which reads
 * a browser session), so it can run in the /pricing server component.
 */

export interface PublicPricingPackage {
  id: string;
  name: string;
  description?: string | null;
  default_duration_minutes: number; // session length (e.g. 60, 30)
  default_price_cents: number; // per-session price
  cadence_label?: string | null; // 'Single session' | '2x per week' | ...
  sessions_per_month?: number | null; // null for drop-in
  monthly_price_cents?: number | null; // null for drop-in / per-session
  is_popular: boolean;
  pricing_sort: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export async function getPublicPricingPackages(): Promise<
  PublicPricingPackage[]
> {
  try {
    const res = await fetch(`${API_BASE}/api/pricing/packages`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: PublicPricingPackage[] };
    return json.data ?? [];
  } catch {
    // Backend unreachable (e.g. not yet deployed) → render an empty page
    // gracefully rather than crashing the marketing route.
    return [];
  }
}

/**
 * Non-secret payment handles for the brand tenant, served by the same tenant
 * settings row the coach edits at /trainer/settings/payments. These used to be
 * hardcoded constants in lib/payments.ts, which meant editing that page changed
 * nothing public.
 */
export interface PublicPaymentMethods {
  venmo_handle: string | null;
  zelle_phone: string | null;
  zelle_email: string | null;
  zelle_display_name: string | null;
}

const NO_PAYMENT_METHODS: PublicPaymentMethods = {
  venmo_handle: null,
  zelle_phone: null,
  zelle_email: null,
  zelle_display_name: null,
};

export async function getPublicPaymentMethods(): Promise<PublicPaymentMethods> {
  try {
    const res = await fetch(`${API_BASE}/api/pricing/payment-methods`, {
      cache: 'no-store',
    });
    if (!res.ok) return NO_PAYMENT_METHODS;
    const json = (await res.json()) as { data?: PublicPaymentMethods };
    return json.data ?? NO_PAYMENT_METHODS;
  } catch {
    // Same contract as the packages fetch: an unreachable backend renders a
    // degraded page, never a crash.
    return NO_PAYMENT_METHODS;
  }
}
