'use client';

import { LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react';
import { Clock4, Library, Layers, Repeat } from 'lucide-react';

const FEATURES = [
  {
    icon: Clock4,
    title: '90-second clip delivery',
    body: 'Log a session, every student gets their personal clip and cue before you close the laptop.',
  },
  {
    icon: Library,
    title: 'Canonical fight library',
    body: 'Match what your student drilled to the highest level of the sport — Marcelo, Khabib, Saenchai, Lomachenko, the receipts.',
  },
  {
    icon: Layers,
    title: 'Weekly plan, session-level adjustments',
    body: 'Mesocycle in one editor. Pipeline proposes adjustments after frustration or breakthrough — you ack, never auto-applied.',
  },
  {
    icon: Repeat,
    title: 'Inactivity radar',
    body: 'Find the students drifting before they ghost you. Quiet alerts, not noise.',
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
              Generic PT software doesn&apos;t know combat sport. Your students
              need to see the technique they drilled tonight, in the hands of
              the people who pioneered it. That&apos;s the loop.
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
