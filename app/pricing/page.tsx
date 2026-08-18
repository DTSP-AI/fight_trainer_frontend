import type { Metadata } from 'next';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NavBar } from '@/components/marketing/nav-bar';
import { Footer } from '@/components/marketing/footer';
import { PaymentMethods } from '@/components/marketing/payment-methods';
import { BRAND } from '@/lib/brand';
import {
  ONE_HOUR_TIERS,
  THIRTY_MIN_TIERS,
  getCheckoutHref,
  getCheckoutLabel,
  type PricingTier,
} from '@/lib/payments';

export const metadata: Metadata = {
  title: 'Private Coaching Pricing',
  description: `Private coaching tailored to your goals — 1-hour and 30-minute sessions with ${BRAND.name}.`,
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

function TierCard({ tier }: { tier: PricingTier }) {
  return (
    <div
      className={`relative flex flex-col rounded-lg border bg-card p-6 ${
        tier.popular
          ? 'border-primary shadow-[0_0_0_1px_hsl(0_71%_42%/0.4)]'
          : 'border-border'
      }`}
    >
      {tier.popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-foreground">
          Most Popular
        </span>
      )}
      <h3 className="text-lg font-semibold">{tier.name}</h3>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-primary">
        {tier.cadence}
      </p>
      <p className="mt-4 text-sm text-muted-foreground">{tier.sessions}</p>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-4xl font-semibold tracking-tight">
          {tier.price}
        </span>
        <span className="text-sm text-muted-foreground">{tier.priceUnit}</span>
      </div>
      {tier.perSession && (
        <p className="mt-2 text-sm text-muted-foreground">{tier.perSession}</p>
      )}
      <Button
        asChild
        size="lg"
        variant={tier.popular ? 'default' : 'outline'}
        className="mt-8"
      >
        <a href={getCheckoutHref(tier)} rel="noopener noreferrer">
          {getCheckoutLabel(tier)}
        </a>
      </Button>
    </div>
  );
}

export default function PricingPage() {
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

        {/* 1-Hour Private Coaching */}
        <section className="mt-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              1-Hour Private Coaching
            </h2>
            <p className="mt-3 text-muted-foreground">
              Perfect for technical development, full skill sessions, strategy,
              and complete training plans.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {ONE_HOUR_TIERS.map((tier) => (
              <TierCard key={tier.id} tier={tier} />
            ))}
          </div>
        </section>

        {/* 30-Minute Private Coaching */}
        <section className="mt-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              30-Minute Private Coaching
            </h2>
            <p className="mt-3 text-muted-foreground">
              Perfect for focused skill work, specific techniques, and busy
              schedules.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-3xl gap-6 md:grid-cols-2">
            {THIRTY_MIN_TIERS.map((tier) => (
              <TierCard key={tier.id} tier={tier} />
            ))}
          </div>
        </section>

        {/* Payment methods */}
        <PaymentMethods />

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
