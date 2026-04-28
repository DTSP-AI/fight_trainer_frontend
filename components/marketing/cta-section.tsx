'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CTASection() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
        <div className="rounded-lg border border-border bg-card p-8 text-center md:p-14">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Multiply your gym, not your hours.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Pilot pricing for the first 5 coaches we onboard. Direct access to
            the team that builds it.
          </p>
          <div className="mt-6 flex justify-center">
            <Button asChild size="lg">
              <Link href="/auth/signup">
                Start Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
