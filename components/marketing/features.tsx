'use client';

import { LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react';
import { Clock4, Library, Layers, Repeat } from 'lucide-react';

const FEATURES = [
  {
    icon: Clock4,
    title: 'Personal clips, fast',
    body: 'After every session you get a clip of the exact technique you drilled — usually within 90 seconds of leaving the mat.',
  },
  {
    icon: Library,
    title: 'See it done right',
    body: 'Your technique in the hands of the greats — Marcelo, Khabib, Saenchai, Lomachenko. The highest level of the sport, matched to what you trained.',
  },
  {
    icon: Layers,
    title: 'A real plan',
    body: 'A weekly structure your coach adjusts as you progress — tuned after a breakthrough or a rough night, never on autopilot.',
  },
  {
    icon: Repeat,
    title: 'Stay accountable',
    body: 'When you go quiet, your coach knows — and pulls you back in before a break turns into quitting.',
  },
];

/**
 * "The loop" section — three real product moments illustrated with copy.
 * Per CONCEPT_BRIEF §7.1: Framer Motion fade-in on scroll, no parallax,
 * no sticky pinning. Reduced-motion respected.
 */
export function Features() {
  const reduce = useReducedMotion();

  return (
    <LazyMotion features={domAnimation} strict>
      <section className="border-y border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              The loop
            </h2>
            <p className="mt-4 text-muted-foreground md:text-lg">
              You drill it tonight. You see it done by the people who pioneered
              it. You carry a cue into next session and do it better. That&apos;s
              the loop — and it&apos;s how you actually get good.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              const animation = reduce
                ? { initial: false, animate: { opacity: 1 } }
                : {
                    initial: { opacity: 0, y: 24 },
                    whileInView: { opacity: 1, y: 0 },
                    viewport: { once: true, margin: '-50px' },
                    transition: {
                      duration: 0.5,
                      delay: i * 0.05,
                      ease: [0.22, 1, 0.36, 1] as const,
                    },
                  };
              return (
                <m.div
                  key={f.title}
                  className="rounded-lg border border-border bg-card p-6"
                  {...animation}
                >
                  <Icon
                    className="mb-4 h-6 w-6 text-primary"
                    aria-hidden="true"
                  />
                  <h3 className="text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
                </m.div>
              );
            })}
          </div>
        </div>
      </section>
    </LazyMotion>
  );
}
