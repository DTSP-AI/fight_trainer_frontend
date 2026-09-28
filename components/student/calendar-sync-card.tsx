'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarPlus, Check, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  studentCalendarApi,
  type StudentCalendarStatus,
} from '@/lib/api/student-calendar';
import { describeApiError } from '@/lib/api';
import { formatRelative } from '@/lib/utils';

export const CALENDAR_SYNC_ANCHOR = 'calendar-sync';

/**
 * One fetch of the student's calendar-sync status, shared by the card, the
 * layout nudge and the post-booking toast. Stays silent on error — the
 * portal must never block on this.
 */
export function useCalendarSync() {
  const [status, setStatus] = useState<StudentCalendarStatus | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const s = await studentCalendarApi.status();
      setStatus(s);
    } catch {
      /* endpoint unavailable — stay silent */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    // Wrapped so the loader's setState calls land in a promise callback
    // rather than synchronously in the effect body.
    void (async () => {
      await refresh();
    })();
  }, [refresh]);

  const snooze = useCallback(async () => {
    try {
      await studentCalendarApi.snooze();
      setStatus((prev) => (prev ? { ...prev, nudge_due: false } : prev));
    } catch (err) {
      toast.error(describeApiError(err));
    }
  }, []);

  const rotate = useCallback(async () => {
    try {
      const s = await studentCalendarApi.rotate();
      setStatus(s);
      toast.success('New link created — the old one no longer works');
    } catch (err) {
      toast.error(describeApiError(err));
    }
  }, []);

  return { status, loaded, refresh, snooze, rotate };
}

export type CalendarSync = ReturnType<typeof useCalendarSync>;

/**
 * "Get sessions on your calendar" — the always-visible surface. Lives on the
 * schedule page and the profile page. Subscribe link works for Google, Apple
 * and Outlook; no Google login needed. Synced = a calendar app has actually
 * pulled the feed.
 */
export function CalendarSyncCard({ sync }: { sync: CalendarSync }) {
  const { status, loaded, refresh, rotate } = sync;

  async function copyLink() {
    if (!status) return;
    try {
      await navigator.clipboard.writeText(status.feed_url);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy — long-press the link instead');
    }
  }

  return (
    <Card id={CALENDAR_SYNC_ANCHOR} className="scroll-mt-24">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarPlus className="h-5 w-5 text-primary" />
          Your calendar
        </CardTitle>
        {loaded && status ? (
          status.synced ? (
            <Badge className="gap-1">
              <Check className="h-3 w-3" />
              Synced
              {status.last_fetched_at
                ? ` · ${formatRelative(status.last_fetched_at)}`
                : ''}
            </Badge>
          ) : (
            <Badge variant="secondary">Not synced yet</Badge>
          )
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {!loaded ? (
          <p className="text-muted-foreground">Checking your calendar…</p>
        ) : !status ? (
          <p className="text-muted-foreground">
            Calendar sync isn&apos;t available right now.
          </p>
        ) : (
          <>
            <p className="text-muted-foreground">
              Subscribe once and every locked-in session shows up on your phone,
              with a reminder two hours before. Reschedules and cancellations
              follow automatically.
              {status.coach_calendar_connected
                ? ' Your coach also sends a Google invite for each session.'
                : ''}
            </p>

            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <a
                  href={status.google_subscribe_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Add to Google Calendar
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href={status.webcal_url}>Apple / Outlook</a>
              </Button>
              <Button variant="ghost" onClick={() => void copyLink()}>
                <Copy className="h-4 w-4" />
                Copy link
              </Button>
            </div>

            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer select-none">
                Button didn&apos;t open your calendar?
              </summary>
              <div className="mt-2 space-y-1">
                <p>
                  <span className="font-medium text-foreground">Google:</span>{' '}
                  open Google Calendar on the web → Other calendars → + → From
                  URL → paste the copied link.
                </p>
                <p>
                  <span className="font-medium text-foreground">iPhone:</span>{' '}
                  Settings → Calendar → Accounts → Add Account → Other → Add
                  Subscribed Calendar → paste the link.
                </p>
                <p>
                  <span className="font-medium text-foreground">Outlook:</span>{' '}
                  Add calendar → Subscribe from web → paste the link.
                </p>
                <p className="pt-1">
                  This link is private to you. Anyone with it can see your
                  session times, so don&apos;t post it.{' '}
                  <button
                    type="button"
                    className="underline underline-offset-2 hover:text-foreground"
                    onClick={() => void rotate()}
                  >
                    Make a new link
                  </button>
                  {' · '}
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
                    onClick={() => void refresh()}
                  >
                    <RefreshCw className="h-3 w-3" />
                    Re-check sync
                  </button>
                </p>
              </div>
            </details>
          </>
        )}
      </CardContent>
    </Card>
  );
}
