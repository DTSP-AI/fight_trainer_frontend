'use client';

import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/common/loading-state';
import { EmptyState } from '@/components/common/empty-state';
import { sessionsApi } from '@/lib/api/sessions';
import { describeApiError } from '@/lib/api';
import { formatDate, formatRelative, formatSecondsToClock } from '@/lib/utils';
import { buildYouTubeEmbedUrl } from '@/lib/youtube';
import type { SessionDetailResponse } from '@/lib/types';

interface SessionDetailProps {
  sessionId: string;
}

export function SessionDetail({ sessionId }: SessionDetailProps) {
  const [data, setData] = useState<SessionDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reprocessing, setReprocessing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    sessionsApi
      .get(sessionId)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(describeApiError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  async function reprocess() {
    setReprocessing(true);
    try {
      await sessionsApi.reprocess(sessionId, { force_clip_refresh: true });
      toast.success('Reprocessing kicked off.');
      const fresh = await sessionsApi.get(sessionId);
      setData(fresh);
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setReprocessing(false);
    }
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }
  if (!data) return <LoadingState label="Loading session…" />;

  const { session, session_techniques, clip_deliveries } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Session · {formatDate(session.session_date)}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Badge
              variant={
                session.status === 'completed'
                  ? 'default'
                  : session.status === 'error'
                    ? 'destructive'
                    : 'outline'
              }
              className="capitalize"
            >
              {session.status}
            </Badge>
            <span>·</span>
            <span>
              {session.duration_minutes
                ? `${session.duration_minutes} min`
                : 'duration n/a'}
            </span>
          </div>
        </div>
        <Button variant="outline" onClick={reprocess} disabled={reprocessing}>
          <RotateCcw className="h-4 w-4" />
          {reprocessing ? 'Reprocessing…' : 'Reprocess'}
        </Button>
      </div>

      {session.error_detail ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {session.error_detail}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Session log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-5 pt-0 text-sm">
            {session.notes ? (
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Notes
                </div>
                <p className="mt-1 whitespace-pre-wrap leading-relaxed">
                  {session.notes}
                </p>
              </div>
            ) : null}
            {session.coaching_cues ? (
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Coaching cues
                </div>
                <p className="mt-1 whitespace-pre-wrap leading-relaxed">
                  {session.coaching_cues}
                </p>
              </div>
            ) : null}
            {session.voice_transcript ? (
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Voice transcript
                </div>
                <p className="mt-1 whitespace-pre-wrap leading-relaxed text-muted-foreground">
                  {session.voice_transcript}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Extracted techniques</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            {session_techniques.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                None yet — the pipeline is still running, or no techniques
                matched.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {session_techniques.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between rounded-md border border-border bg-background p-2"
                  >
                    <span className="font-mono text-xs">{t.technique_id}</span>
                    {t.confidence != null ? (
                      <Badge variant="outline">
                        conf {(t.confidence * 100).toFixed(0)}%
                      </Badge>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clip delivered</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-5 pt-0">
          {clip_deliveries.length === 0 ? (
            <EmptyState
              title="Pipeline still running"
              description="Clips usually land within ~90 seconds. Refresh to check."
            />
          ) : (
            clip_deliveries.map((d) => {
              // The trainer view uses the same iframe as the student does so
              // the trainer can verify what the student is seeing.
              return (
                <div
                  key={d.id}
                  className="rounded-md border border-border bg-background p-4"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="aspect-video overflow-hidden rounded">
                      <iframe
                        title={`Clip ${d.id}`}
                        src={buildYouTubeEmbedUrl(
                          // youtube_id isn't on ClipDelivery — trainer view
                          // surfaces the delivery message + range; full preview
                          // is in the student's feed. If the API surfaces the
                          // youtube_id later this swaps in trivially.
                          'placeholder',
                          d.timestamp_start_seconds,
                          d.timestamp_end_seconds,
                        )}
                        allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                        loading="lazy"
                        className="h-full w-full"
                      />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Delivered {formatRelative(d.delivered_at)} ·{' '}
                        {formatSecondsToClock(d.timestamp_start_seconds)} –{' '}
                        {formatSecondsToClock(d.timestamp_end_seconds)}
                      </div>
                      <p className="mt-2 text-sm leading-relaxed">
                        {d.delivery_message}
                      </p>
                      {d.student_rating ? (
                        <p className="mt-3 text-xs text-muted-foreground">
                          Student rating: {d.student_rating}/5
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
