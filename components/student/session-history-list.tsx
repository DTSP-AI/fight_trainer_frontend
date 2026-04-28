'use client';

import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/common/loading-state';
import { EmptyState } from '@/components/common/empty-state';
import { studentPortalApi } from '@/lib/api/student-portal';
import { describeApiError } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Session } from '@/lib/types';

export function SessionHistoryList() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    studentPortalApi
      .mySessions(20)
      .then((res) => {
        if (!cancelled) setSessions(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(describeApiError(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }
  if (!sessions) return <LoadingState label="Loading sessions…" />;
  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={<Activity className="h-8 w-8" />}
        title="No sessions yet"
        description="Your coach hasn't logged a session for you yet. Once they do, history shows up here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((s) => (
        <Card key={s.id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <div className="text-sm font-medium">
                {formatDate(s.session_date)}
              </div>
              <div className="text-xs text-muted-foreground">
                {s.duration_minutes ? `${s.duration_minutes} min` : 'duration n/a'}
                {s.sparring_rounds_count != null
                  ? ` · ${s.sparring_rounds_count} rounds`
                  : ''}
              </div>
              {s.coaching_cues ? (
                <p className="mt-2 max-w-2xl text-sm text-foreground">
                  {s.coaching_cues}
                </p>
              ) : null}
            </div>
            <Badge variant="outline" className="capitalize">
              {s.status}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
