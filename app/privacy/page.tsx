import type { Metadata } from 'next';
import { NavBar } from '@/components/marketing/nav-bar';
import { Footer } from '@/components/marketing/footer';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `How ${BRAND.name} collects, uses, and protects your data.`,
};

const UPDATED = 'August 19, 2026';

export default function PrivacyPage() {
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-3xl px-4 py-16 md:px-8 md:py-24">
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Last updated: {UPDATED}
        </p>

        <div className="mt-10 space-y-8 text-muted-foreground">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              1. What we collect
            </h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <span className="text-foreground">Account information</span> —
                your name and email.
              </li>
              <li>
                <span className="text-foreground">Intake information</span> —
                where provided: training experience, goals, injuries and
                physical limitations, and an emergency contact.
              </li>
              <li>
                <span className="text-foreground">Training data</span> — session
                logs, packages, schedules, and coaching notes created by you or
                your coach.
              </li>
              <li>
                <span className="text-foreground">Technical data</span> — basic
                usage and device information needed to run and secure the
                service.
              </li>
            </ul>
            <p>
              We do <span className="text-foreground">not</span> collect or
              store full payment-card numbers. Payments are handled by
              third-party providers (e.g. Venmo, Zelle, or a card processor).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              2. How we use it
            </h2>
            <p>
              To provide coaching, deliver session feedback and clips, manage
              packages and scheduling, keep your account secure, and
              communicate with you about the service. Injury and emergency-
              contact information is used for your safety during training.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              3. What&apos;s shared
            </h2>
            <p>
              Your data is scoped to your coach&apos;s program. We do not sell
              your personal information. We share data only with the service
              providers that run the platform (such as our hosting, database,
              and payment providers) and only as needed to operate the service,
              or where required by law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              4. Data isolation
            </h2>
            <p>
              Each coach&apos;s clients and data are isolated from other
              coaches&apos; data. A client&apos;s records are visible to their
              own coach, not to other coaches or other clients.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              5. Retention
            </h2>
            <p>
              We keep your information for as long as your account is active or
              as needed to provide the service and meet legal obligations. You
              may request deletion of your account data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              6. Your choices
            </h2>
            <p>
              You may request access to, correction of, or deletion of your
              personal data by contacting your coach or reaching us through{' '}
              {BRAND.domain}.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              7. Security
            </h2>
            <p>
              We use industry-standard measures — encrypted connections,
              authenticated access, and per-account data isolation — to protect
              your information. No system is perfectly secure, but we work to
              keep your data safe.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              8. Children
            </h2>
            <p>
              The service is intended for adults. Minors may participate only
              with the consent and supervision of a parent or legal guardian.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              9. Changes &amp; contact
            </h2>
            <p>
              We may update this policy; the &ldquo;Last updated&rdquo; date
              above reflects the latest version. Questions? Contact your coach
              or reach us through {BRAND.domain}.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
