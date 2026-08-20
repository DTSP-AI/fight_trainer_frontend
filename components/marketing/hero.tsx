'use client';

import Link from 'next/link';
import { LazyMotion, domAnimation, m } from 'motion/react';
import { useReducedMotion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BRAND } from '@/lib/brand';

/**
 * Marketing hero — single column, no image placeholder.
 * High-contrast headline + two supporting lines + one primary CTA + one secondary.
 * Static — no auto-loops, no parallax, no sticky pinning.
 * Bundle ≤4.6KB on motion via LazyMotion+m.
 */
export function Hero() {
  const reduce = useReducedMotion();
  const fade = reduce
    ? { initial: false, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <LazyMotion features={domAnimation} strict>
      <section className="surface-3d relative overflow-hidden">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center md:px-8 md:py-32 lg:py-40">
          <m.div className="flex flex-col items-center" {...fade}>
            <span className="mb-6 inline-flex w-fit items-center rounded-full border border-border bg-card/70 px-3 py-1 text-xs uppercase tracking-wider text-muted-foreground backdrop-blur">
              Private coaching · BJJ · MMA · Muay Thai · Boxing
            </span>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl lg:text-6xl">
              {BRAND.tagline}
            </h1>
            <p className="mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
              After every session, get a personal clip of the technique you
              drilled — pulled from canonical fight footage of the greats — with
              a cue from your coach. Usually within 90 seconds.
            </p>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground/80">
              Focused coaching, consistent reps, and immediate feedback — the
              fastest way to actually improve.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/auth/signup">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/about">How it works</Link>
              </Button>
            </div>
          </m.div>
        </div>
      </section>
    </LazyMotion>
  );
}
