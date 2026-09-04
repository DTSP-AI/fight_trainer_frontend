import type { Metadata } from 'next';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NavBar } from '@/components/marketing/nav-bar';
import { Footer } from '@/components/marketing/footer';
import { PaymentMethods } from '@/components/marketing/payment-methods';
import { BRAND } from '@/lib/brand';
import {
  getPublicPaymentMethods,
  getPublicPricingPackages,
  type PublicPricingPackage,
} from '@/lib/api/pricing';
import {
  getCheckoutHref,
  getCheckoutLabel,
  packagePriceLabel,
  packagePriceUnit,
  packagePerSessionLabel,
} from '@/lib/payments';

export const metadata: Metadata = {
  title: 'Private Coaching Pricing',
  description: `Private coaching tailored to your goals — packages with ${BRAND.name}.`,
};

const INCLUDED = [
  'Personalized Training Plan',
  'Technical Analysis & Corrections',
  'Competition Preparation',
  'Striking Development',
  'Grappling Development',
  'Fight IQ & Strategy',
  'Accountability',
  'Progress Tracking',
];

const WHO_ITS_FOR = [
  'Complete Beginners',
  'BJJ Practitioners',
  'MMA Athletes',
  'Amateur Competitors',
  'Professional Fighters',
  'Anyone seeking faster results through individualized coaching',
];

const POLICIES = [
  'Monthly packages are prepaid and reserved in advance.',
  '24-hour notice required for schedule changes.',
  'Unused sessions do not roll over to the next month.',
  'Non-refundable.',
];

function durationLabel(minutes: number): string {
  if (minutes === 60) return '1-Hour Private Coaching';
  if (minutes === 30) return '30-Minute Private Coaching';
  return `${minutes}-Minute Private Coaching`;
}

/** Group packages by session length, groups ordered longest-first, packages
 *  within a group by their pricing_sort. */
function groupByDuration(
  packages: PublicPricingPackage[],
): { minutes: number; label: string; packages: PublicPricingPackage[] }[] {
  const byDuration = new Map<number, PublicPricingPackage[]>();
  for (const p of packages) {
    const arr = byDuration.get(p.default_duration_minutes) ?? [];
    arr.push(p);
    byDuration.set(p.default_duration_minutes, arr);
  }
  return [...byDuration.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([minutes, pkgs]) => ({
      minutes,
      label: durationLabel(minutes),
      packages: pkgs.sort((a, b) => a.pricing_sort - b.pricing_sort),
    }));
}

function PackageCard({
  pkg,
  venmoHandle,
}: {
  pkg: PublicPricingPackage;
  venmoHandle: string | null;
}) {
  const perSession = packagePerSessionLabel(pkg);
  const href = getCheckoutHref(pkg, venmoHandle);
  return (
    <div
      className={`relative flex flex-col rounded-lg border bg-card p-6 ${
        pkg.is_popular
          ? 'border-primary shadow-[0_0_0_1px_hsl(0_71%_42%/0.4)]'
          : 'border-border'
      }`}
    >
      {pkg.is_popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-foreground">
          Most Popular
        </span>
      )}
      <h3 className="text-lg font-semibold">
        {pkg.cadence_label ?? pkg.name}
      </h3>
      {pkg.cadence_label && (
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-primary">
          {pkg.cadence_label}
        </p>
      )}
      {pkg.sessions_per_month ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {pkg.sessions_per_month} sessions per month
        </p>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">1 session</p>
      )}
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-4xl font-semibold tracking-tight">
          {packagePriceLabel(pkg)}
        </span>
        <span className="text-sm text-muted-foreground">
          {packagePriceUnit(pkg)}
        </span>
      </div>
      {perSession && (
        <p className="mt-2 text-sm text-muted-foreground">{perSession}</p>
      )}
      {href ? (
        <Button
          asChild
          size="lg"
          variant={pkg.is_popular ? 'default' : 'outline'}
          className="mt-8"
        >
          <a href={href} rel="noopener noreferrer">
            {getCheckoutLabel(pkg, venmoHandle)}
          </a>
        </Button>
      ) : (
        // No payment handle configured: show the price, never a dead pay link.
        <p className="mt-8 text-sm text-muted-foreground">
          Contact your coach to arrange payment.
        </p>
      )}
    </div>
  );
}

export default async function PricingPage() {
  const [packages, paymentMethods] = await Promise.all([
    getPublicPricingPackages(),
    getPublicPaymentMethods(),
  ]);
  const groups = groupByDuration(packages);

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24">
        {/* Hero */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Private Coaching
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-6xl">
            Train With Intent
          </h1>
          <p className="mt-3 text-sm font-medium uppercase tracking-[0.15em] text-muted-foreground">
            Focused coaching. Real progress.
          </p>
          <p className="mt-6 text-muted-foreground md:text-lg">
            Private coaching tailored to your goals with purpose, intensity, and
            strategy. The fastest way to improve is focused coaching, consistent
            repetition, and immediate feedback.
          </p>
        </div>

        {groups.length === 0 ? (
          <p className="mx-auto mt-16 max-w-lg text-center text-muted-foreground">
            Packages are being finalized. Check back shortly, or reach out to
            book directly.
          </p>
        ) : (
          groups.map((group) => (
            <section key={group.minutes} className="mt-20">
              <div className="mx-auto max-w-3xl text-center">
                <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                  {group.label}
                </h2>
              </div>
              <div className="mx-auto mt-12 grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-4">
                {group.packages.map((pkg) => (
                  <PackageCard
                    key={pkg.id}
                    pkg={pkg}
                    venmoHandle={paymentMethods.venmo_handle}
                  />
                ))}
              </div>
            </section>
          ))
        )}

        {/* Payment methods */}
        <PaymentMethods methods={paymentMethods} />

        {/* What's Included + Who It's For */}
        <section className="mt-24 grid gap-12 rounded-lg border border-border bg-card p-8 md:grid-cols-2 md:p-12">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              What&apos;s Included
            </h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Who This Is For
            </h2>
            <ul className="mt-6 space-y-3">
              {WHO_ITS_FOR.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Policies */}
        <ul className="mx-auto mt-8 grid max-w-5xl gap-4 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
          {POLICIES.map((policy) => (
            <li
              key={policy}
              className="rounded-md border border-border px-4 py-3"
            >
              {policy}
            </li>
          ))}
        </ul>
      </main>
      <Footer />
    </>
  );
}
