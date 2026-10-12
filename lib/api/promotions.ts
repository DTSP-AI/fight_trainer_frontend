/**
 * Public promotions — the campaign page at /promo/[slug]. No auth; the backend
 * pins reads to the brand tenant (same scope as /pricing).
 *
 * Server-safe GET (runs in the server component) + a client-side checkout
 * POST that returns the Stripe URL to redirect to.
 */
export interface PublicPromotion {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  service_name?: string | null;
  duration_minutes?: number | null;
  total_sessions: number;
  price_per_session_cents: number;
  total_price_cents: number;
  image_url?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  per_customer_limit?: number | null;
  status: 'live' | 'sold_out' | 'unavailable';
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export async function getPublicPromotion(slug: string): Promise<PublicPromotion | null> {
  try {
    const res = await fetch(`${API_BASE}/api/promotions/public/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: PublicPromotion };
    return json.data ?? null;
  } catch {
    return null;
  }
}

export interface PromotionCheckoutResult {
  checkout_url: string;
  redemption_id: string;
}

export class PromotionCheckoutError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export async function startPromotionCheckout(
  slug: string,
  input: { email: string; name?: string },
): Promise<PromotionCheckoutResult> {
  const res = await fetch(`${API_BASE}/api/promotions/public/${encodeURIComponent(slug)}/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const json = (await res.json().catch(() => ({}))) as {
    data?: PromotionCheckoutResult;
    error?: { code?: string; message?: string };
  };
  if (!res.ok || !json.data) {
    throw new PromotionCheckoutError(
      json.error?.code ?? 'CHECKOUT_FAILED',
      json.error?.message ?? 'Could not start checkout.',
    );
  }
  return json.data;
}
