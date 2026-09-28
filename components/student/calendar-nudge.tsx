'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { studentCalendarApi } from '@/lib/api/student-calendar';
import { CALENDAR_SYNC_ANCHOR } from '@/components/student/calendar-sync-card';

/**
 * "Get sessions on your calendar" nudge. Mounted in the student layout, so
 * it shows on every student page except the schedule page (which carries
 * the full card). Backend decides `nudge_due`: not synced AND not snoozed.
 * "Later" snoozes it server-side for 7 days, so it comes back — that's the
 * "here and there" — until a calendar app actually pulls the feed.
 */
export function CalendarNudge() {
  const pathname = usePathname();
  const [due, setDue] = useState(false);

  useEffect(() => {
    let cancelled = false;
    studentCalendarApi
      .status()
      .then((s) => {
        if (!cancelled) setDue(s.nudge_due);
      })
      .catch(() => {
        /* endpoint unavailable — stay silent, never block the portal */
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!due || pathname?.startsWith('/student/schedule')) return null;

  async function later() {
    setDue(false);
    try {
      await studentCalendarApi.snooze();
    } catch {
      /* best effort — it'll show again next load */
    }
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-primary/40 bg-primary/10 p-3 text-sm">
      <CalendarPlus className="h-4 w-4 shrink-0 text-primary" />
      <span className="min-w-0 flex-1">
        <span className="font-medium">Get your sessions on your calendar</span>
        {' — '}one tap and every booking lands on your phone with a reminder.
      </span>
      <div className="flex items-center gap-1">
        <Button asChild size="sm">
          <Link href={`/student/schedule#${CALENDAR_SYNC_ANCHOR}`}>Set it up</Link>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label="Remind me later"
          title="Remind me later"
          onClick={() => void later()}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
