'use client';

import { LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react';
import { ClipboardList, Film, Library, TrendingUp } from 'lucide-react';

const FEATURES = [
  {
    icon: ClipboardList,
    title: 'Log every session',
    body: 'What you drilled, how it went, and the cue your coach wants you to carry into next time. A record of your training, not a memory of it.',
  },
  {
    icon: TrendingUp,
    title: 'See your progress',
    body: 'A training plan your coach adjusts as you improve, a history that shows how far you have come, and a coach who notices when you go quiet.',
  },
  {
    icon: Library,
    title: 'Understand the skill',
    body: 'AI matches each technique you trained to real fights and breaks down what the best in the sport do with it, so you know what you are building toward.',
  },
  {
    icon: Film,
    title: 'Break down real fights',
    body: 'Analyze any fight through the lens of what you have learned. Personalized to your training history, not generic commentary.',
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
              You train. It gets logged. AI shows you the same technique in
              real fights and what to look for. Next session, you do it better.
              That&apos;s the loop — and it&apos;s how you actually get good.
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
