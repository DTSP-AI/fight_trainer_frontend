import type { Metadata } from 'next';
import { NavBar } from '@/components/marketing/nav-bar';
import { Footer } from '@/components/marketing/footer';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'How it works',
  description: `How private coaching with ${BRAND.name} turns each session into progress.`,
};

export default function AboutPage() {
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-3xl px-4 py-16 md:px-8 md:py-24">
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
          Every session turns into progress.
        </h1>
        <div className="mt-8 space-y-6 text-muted-foreground md:text-lg">
          <p>
            Generic fitness apps don&apos;t know combat sport. You don&apos;t
            need another habit tracker — you need to see the technique you
            drilled tonight in the hands of the people who pioneered it, and a
            clear cue to carry into the next round.
          </p>
          <p>
            {BRAND.name} is private coaching with a memory. Train with your
            coach, and within about 90 seconds you get a personal clip from
            canonical fight footage of exactly what you worked on — plus a short
            cue written for you.
          </p>
          <p className="text-foreground">How a session becomes progress:</p>
          <ol className="list-decimal space-y-3 pl-6">
            <li>
              <span className="text-foreground">You train.</span> Drill the
              technique with your coach, live on the mat.
            </li>
            <li>
              <span className="text-foreground">It gets matched.</span> What you
              drilled is matched to the highest level of the sport — Marcelo,
              Khabib, Saenchai, Lomachenko, the receipts.
            </li>
            <li>
              <span className="text-foreground">You get your clip.</span> On
              your phone, in your portal, before you even leave the building —
              with a 2–4 sentence cue from your coach.
            </li>
            <li>
              <span className="text-foreground">You improve.</span> Your plan
              adjusts as you progress, and your coach sees when you drift — so
              you stay on track instead of fading out.
            </li>
          </ol>
        </div>
      </main>
      <Footer />
    </>
  );
}
