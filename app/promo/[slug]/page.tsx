import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NavBar } from '@/components/marketing/nav-bar';
import { Footer } from '@/components/marketing/footer';
import { BRAND } from '@/lib/brand';
import { getPublicPromotion } from '@/lib/api/promotions';
import { PromotionCheckout } from './promotion-checkout';

/**
 * Public promotion page — anyone with the link can buy the package.
 * Server component fetches the promotion (brand tenant only); the checkout
 * form is a client island that redirects to Stripe. The webhook fulfils the
 * purchase: roster row (invite goes out for a new buyer), package, payment.
 */

type Params = { slug: string };

function fmtCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const promo = await getPublicPromotion(slug);
  if (!promo) return { title: BRAND.name };
  return {
    title: `${promo.title} · ${BRAND.name}`,
    description: promo.description ?? `${promo.total_sessions} sessions for ${fmtCents(promo.total_price_cents)}`,
    openGraph: promo.image_url ? { images: [{ url: promo.image_url }] } : undefined,
  };
}

export default async function PromotionPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const promo = await getPublicPromotion(slug);
  if (!promo) notFound();

  const paid = query.paid === '1';
  const cancelled = query.cancelled === '1';
  const regular = promo.total_sessions * promo.price_per_session_cents;

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-12 md:px-8 md:py-20">
        <div className="grid gap-10 md:grid-cols-2 md:items-start">
          <div>
            {promo.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- coach-supplied graphic in Storage
              <img
                src={promo.image_url}
                alt={promo.title}
                className="w-full rounded-lg border border-border object-cover"
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
                {BRAND.name}
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              {promo.service_name ?? 'Private coaching'}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">{promo.title}</h1>
            {promo.description ? (
              <p className="mt-4 text-muted-foreground md:text-lg">{promo.description}</p>
            ) : null}

            <div className="mt-8 rounded-lg border border-border bg-card p-6">
              <p className="text-4xl font-semibold">{fmtCents(promo.total_price_cents)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {promo.total_sessions} sessions
                {promo.duration_minutes ? ` · ${promo.duration_minutes} min each` : ''}
                {' · '}
                {fmtCents(promo.price_per_session_cents)} per session
              </p>
              {regular !== promo.total_price_cents ? null : null}
              {promo.per_customer_limit ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Limit {promo.per_customer_limit} per customer.
                </p>
              ) : null}
              {promo.ends_at ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Available until {new Date(promo.ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.
                </p>
              ) : null}

              {paid ? (
                <div className="mt-6 rounded-md border border-primary/40 bg-primary/10 p-4 text-sm">
                  <p className="font-medium">Payment received. Check your email.</p>
                  <p className="mt-1 text-muted-foreground">
                    Your sessions are on your account. If you are new here, the email has your sign-in link.
                  </p>
                </div>
              ) : (
                <PromotionCheckout slug={promo.slug} status={promo.status} cancelled={cancelled} />
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
