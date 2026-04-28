import type { Metadata } from 'next';
import { NavBar } from '@/components/marketing/nav-bar';
import { Footer } from '@/components/marketing/footer';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'About',
  description: `How ${BRAND.name} multiplies what a coach already does.`,
};

export default function AboutPage() {
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-3xl px-4 py-16 md:px-8 md:py-24">
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
          Built for the coach in the room, not the platform team.
        </h1>
        <div className="mt-8 space-y-6 text-muted-foreground md:text-lg">
          <p>
            Generic personal-training software doesn&apos;t know combat sport.
            Your students don&apos;t need another habit-tracker — they need to
            see the technique they drilled tonight, in the hands of the people
            who pioneered it.
          </p>
          <p>
            {BRAND.name} is a workflow you stand inside, not a chatbot you talk
            to. Log a session in 30 seconds. Within 90 seconds, every student
            gets a personal clip from canonical fight footage of the technique
            you covered — with a 2–4 sentence cue you wrote.
          </p>
          <p className="text-foreground">How it actually goes:</p>
          <ol className="list-decimal space-y-3 pl-6">
            <li>
              <span className="text-foreground">You log.</span> Pick the
              technique, drop a cue, hit save. Voice mode if your hands are
              taped.
            </li>
            <li>
              <span className="text-foreground">The pipeline finds the clip.</span>{' '}
              Marcelo, Khabib, Saenchai, Lomachenko, the receipts. Same
              footage every student of yours sees for that technique — the
              cue is what&apos;s personal.
            </li>
            <li>
              <span className="text-foreground">Students get the clip.</span>{' '}
              In their portal, on their phone, before they leave the building.
            </li>
            <li>
              <span className="text-foreground">You watch the loop.</span>{' '}
              Inactivity radar. Plan adjustments proposed by the pipeline,
              never auto-applied. You stay the coach.
            </li>
          </ol>
        </div>
      </main>
      <Footer />
    </>
  );
}
