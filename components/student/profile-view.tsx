'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/common/loading-state';
import { studentPortalApi } from '@/lib/api/student-portal';
import { describeApiError } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Student } from '@/lib/types';

export function ProfileView() {
  const [me, setMe] = useState<Student | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    studentPortalApi
      .me()
      .then((res) => {
        if (!cancelled) setMe(res);
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
  if (!me) return <LoadingState label="Loading profile…" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{me.full_name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-6 pt-0 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="capitalize">
            {me.primary_sport.replace('_', ' ')}
          </Badge>
          {me.skill_level ? (
            <Badge variant="outline" className="capitalize">
              {me.skill_level}
            </Badge>
          ) : null}
        </div>
        <div className="grid gap-2 text-muted-foreground">
          <div>
            <span className="text-foreground">Started: </span>
            {formatDate(me.started_training_at) || '—'}
          </div>
          {me.notes ? (
            <div>
              <span className="text-foreground">Notes: </span>
              {me.notes}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
