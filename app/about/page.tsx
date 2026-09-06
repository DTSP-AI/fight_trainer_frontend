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
            need another habit tracker — you need a record of what you trained,
            a clear view of how you&apos;re progressing, and a real
            understanding of the skills you&apos;re building.
          </p>
          <p>
            {BRAND.name} is private coaching with a memory. Every session is
            logged with your coach. AI matches the techniques you drilled to
            real fights and breaks down what the best in the sport do with
            them, so each session adds to something you can see.
          </p>
          <p className="text-foreground">How a session becomes progress:</p>
          <ol className="list-decimal space-y-3 pl-6">
            <li>
              <span className="text-foreground">You train.</span> Drill the
              technique with your coach, live on the mat.
            </li>
            <li>
              <span className="text-foreground">It gets logged.</span> What you
              drilled, how it went, and the cue your coach wants you to carry
              forward — recorded, not remembered.
            </li>
            <li>
              <span className="text-foreground">You understand it.</span> AI
              finds the same technique in real fights and breaks down how the
              best apply it, personalized to your training history.
            </li>
            <li>
              <span className="text-foreground">You improve.</span> Your plan
              adjusts as you progress, your history shows how far you&apos;ve
              come, and your coach sees when you drift — so you stay on track
              instead of fading out.
            </li>
          </ol>
        </div>
      </main>
      <Footer />
    </>
  );
}
