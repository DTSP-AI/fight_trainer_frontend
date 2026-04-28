import { NavBar } from '@/components/marketing/nav-bar';
import { Hero } from '@/components/marketing/hero';
import { Features } from '@/components/marketing/features';
import { CTASection } from '@/components/marketing/cta-section';
import { Footer } from '@/components/marketing/footer';

export default function HomePage() {
  return (
    <>
      <NavBar />
      <main>
        <Hero />
        <Features />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
