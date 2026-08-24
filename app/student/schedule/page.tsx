'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { LoadingState } from '@/components/common/loading-state';
import { EmptyState } from '@/components/common/empty-state';
import { PushToggle } from '@/components/common/push-toggle';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { calendarApi, type CalendarEvent } from '@/lib/api/calendar';
import { describeApiError } from '@/lib/api';

function fmtWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function bucketEvents(events: CalendarEvent[]) {
  const now = Date.now();
  const upcoming: CalendarEvent[] = [];
  const past: CalendarEvent[] = [];
  for (const e of events) {
    const t = new Date(e.starts_at).getTime();
    if (t >= now - 60_000) upcoming.push(e);
    else past.push(e);
  }
  upcoming.sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
  past.sort(
    (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime(),
  );
  return { upcoming, past };
}

export default function StudentSchedulePage() {
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const now = new Date();
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      const to = new Date(now);
      to.setDate(to.getDate() + 60);
      const evs = await calendarApi.events({
        from_date: from.toISOString(),
        to_date: to.toISOString(),
      });
      setEvents(evs);
    } catch (err) {
      setError(describeApiError(err));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const { upcoming, past } = useMemo(
    () => bucketEvents(events ?? []),
    [events],
  );

  if (error) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        {error}
      </p>
    );
  }
  if (!events) return <LoadingState label="Loading your schedule…" />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Schedule</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your upcoming and recent sessions. Your coach manages dates.
          </p>
        </div>
        <PushToggle />
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState
            title="Nothing on the calendar"
            description="Your coach hasn't added any upcoming sessions yet."
          />
        ) : (
          <div className="space-y-2">
            {upcoming.map((e) => (
              <EventRow key={`${e.kind}-${e.id}`} ev={e} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Past 30 days
        </h2>
        {past.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No recent sessions.
          </p>
        ) : (
          <div className="space-y-2">
            {past.slice(0, 20).map((e) => (
              <EventRow key={`${e.kind}-${e.id}`} ev={e} muted />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EventRow({ ev, muted }: { ev: CalendarEvent; muted?: boolean }) {
  const isLogged = !!ev.fulfilled_session_id;
  const status = ev.kind === 'scheduled' ? ev.status ?? 'scheduled' : null;
  return (
    <Card className={muted ? 'opacity-80' : ''}>
      <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold">{fmtWhen(ev.starts_at)}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {ev.duration_minutes ? `${ev.duration_minutes} min` : 'Plan item'}
            {ev.kind === 'planned' && ev.session_type
              ? ` · ${ev.session_type}`
              : ''}
            {ev.kind === 'planned' && ev.plan_focus
              ? ` · ${ev.plan_focus}`
              : ''}
          </div>
        </div>
        {isLogged ? (
          <Badge>Done</Badge>
        ) : status === 'no_show' ? (
          <Badge variant="destructive">Missed</Badge>
        ) : status === 'cancelled' ? (
          <Badge variant="destructive">Cancelled</Badge>
        ) : ev.kind === 'planned' ? (
          <Badge variant="secondary">Plan</Badge>
        ) : (
          <Badge variant="secondary">Scheduled</Badge>
        )}
      </CardContent>
    </Card>
  );
}
