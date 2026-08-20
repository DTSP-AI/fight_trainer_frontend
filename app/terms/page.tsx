import type { Metadata } from 'next';
import { NavBar } from '@/components/marketing/nav-bar';
import { Footer } from '@/components/marketing/footer';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `Terms of Service for ${BRAND.name}.`,
};

const UPDATED = 'August 19, 2026';

export default function TermsPage() {
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-3xl px-4 py-16 md:px-8 md:py-24">
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
          Terms of Service
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Last updated: {UPDATED}
        </p>

        <div className="mt-10 space-y-8 text-muted-foreground">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              1. Agreement
            </h2>
            <p>
              These Terms govern your use of {BRAND.name} ({BRAND.domain}) and
              the private coaching services offered through it. By creating an
              account or booking a session, you agree to these Terms. If you do
              not agree, do not use the service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              2. The service
            </h2>
            <p>
              {BRAND.name} provides private combat-sports coaching and the tools
              a coach uses to manage sessions, packages, scheduling, and
              training feedback. Coaches operate their own programs; clients
              (students) train under an inviting coach.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              3. Accounts
            </h2>
            <p>
              Coaches create their own accounts. Clients join by invitation from
              their coach and set their own password. You are responsible for
              keeping your password secure and for all activity under your
              account. You must be at least 18 years old, or have the consent
              and supervision of a parent or legal guardian.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              4. Assumption of risk
            </h2>
            <p>
              Combat sports and physical training carry an inherent risk of
              injury. You participate voluntarily and assume that risk. Where a
              liability waiver is presented, you must review and sign it before
              training. Consult a physician before beginning any training
              program.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              5. Packages, payments &amp; scheduling
            </h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>Monthly packages are prepaid and reserved in advance.</li>
              <li>24-hour notice is required for schedule changes.</li>
              <li>Unused sessions do not roll over to the next month.</li>
              <li>
                Package payments are non-refundable except where required by
                law.
              </li>
              <li>
                Payments are made through third-party providers (e.g. Venmo,
                Zelle, or a card processor). Their terms apply to the payment
                itself; we do not store your full card details.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              6. Acceptable use
            </h2>
            <p>
              Do not misuse the service, attempt to access other users&apos;
              data, disrupt the platform, or use it for anything unlawful.
              Coaching content and clips provided through the service are for
              your personal training use only.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              7. Termination
            </h2>
            <p>
              You may stop using the service at any time. We may suspend or
              terminate access for violation of these Terms or to protect the
              service and its users.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              8. Disclaimers &amp; limitation of liability
            </h2>
            <p>
              The service is provided &ldquo;as is&rdquo; without warranties of
              any kind. To the maximum extent permitted by law, {BRAND.name} is
              not liable for indirect, incidental, or consequential damages, or
              for injury arising from training you undertake at your own risk.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              9. Changes
            </h2>
            <p>
              We may update these Terms. Material changes will be reflected by
              the &ldquo;Last updated&rdquo; date above. Continued use after a
              change means you accept the updated Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              10. Contact
            </h2>
            <p>
              Questions about these Terms? Contact your coach, or reach us
              through {BRAND.domain}.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
