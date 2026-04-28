import type { Metadata } from 'next';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NavBar } from '@/components/marketing/nav-bar';
import { Footer } from '@/components/marketing/footer';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Pricing',
  description: `Pilot pricing for the first coaches onboarding to ${BRAND.name}.`,
};

const TIERS = [
  {
    name: 'Pilot',
    price: 'Free',
    cadence: 'first 30 days',
    cta: 'Start Free',
    href: '/auth/signup',
    primary: true,
    features: [
      'Up to 25 students',
      '90-second clip delivery',
      'Canonical fight library',
      'Weekly plan editor',
      'Inactivity radar',
      'Direct line to the build team',
    ],
  },
  {
    name: 'Coach',
    price: '$49',
    cadence: 'per month',
    cta: 'Talk to us',
    href: '/auth/signup',
    primary: false,
    features: [
      'Up to 100 students',
      'Everything in Pilot',
      'Voice-mode session logs',
      'CSV roster import',
      'Priority support',
    ],
  },
  {
    name: 'Gym',
    price: 'Custom',
    cadence: 'multi-coach',
    cta: 'Talk to us',
    href: '/auth/signup',
    primary: false,
    features: [
      'Unlimited students',
      'Multiple coaches',
      'Brand customization',
      'Service-level commitment',
    ],
  },
];

export default function PricingPage() {
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Pilot pricing while we learn together.
          </h1>
          <p className="mt-4 text-muted-foreground md:text-lg">
            {BRAND.name} is in early access. The first coaches onboarded shape
            the product and get pricing locked at pilot rates.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`flex flex-col rounded-lg border bg-card p-8 ${
                tier.primary
                  ? 'border-primary shadow-[0_0_0_1px_hsl(0_71%_42%/0.4)]'
                  : 'border-border'
              }`}
            >
              <h3 className="text-lg font-semibold">{tier.name}</h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-semibold tracking-tight">
                  {tier.price}
                </span>
                <span className="text-sm text-muted-foreground">
                  {tier.cadence}
                </span>
              </div>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                size="lg"
                variant={tier.primary ? 'default' : 'outline'}
                className="mt-8"
              >
                <Link href={tier.href}>{tier.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
