'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList } from 'lucide-react';
import { intakeApi } from '@/lib/api/intake';

/**
 * Onboarding nudge for students who accepted their invite but never completed
 * intake (emergency contact, injuries, goals, waiver). Renders a banner on
 * every student page except the intake page itself; disappears once the
 * intake row exists AND the waiver is signed.
 */
export function IntakeReminder() {
  const pathname = usePathname();
  const [needed, setNeeded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    intakeApi
      .getMine()
      .then((bundle) => {
        if (cancelled) return;
        setNeeded(bundle.intake === null || bundle.waiver_signed === null);
      })
      .catch(() => {
        /* endpoint unavailable — stay silent, never block the portal */
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!needed || pathname?.startsWith('/student/intake')) return null;

  return (
    <Link
      href="/student/intake"
      className="mb-4 flex items-center gap-3 rounded-md border border-primary/40 bg-primary/10 p-3 text-sm transition-colors hover:bg-primary/15"
    >
      <ClipboardList className="h-4 w-4 shrink-0 text-primary" />
      <span>
        <span className="font-medium">Finish setting up your profile</span>
        {' — '}your coach needs your intake (emergency contact, injuries, goals)
        and a signed waiver before your next session. Tap to complete it.
      </span>
    </Link>
  );
}
