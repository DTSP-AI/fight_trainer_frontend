'use client';

import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Film, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingState } from '@/components/common/loading-state';
import { dashboardApi } from '@/lib/api/dashboard';
import { describeApiError } from '@/lib/api';
import type { DashboardSummary } from '@/lib/types';

const TILES: {
  key: keyof DashboardSummary;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: 'active_students_count', label: 'Active students', icon: Users },
  { key: 'sessions_this_week', label: 'Sessions this week', icon: Activity },
  { key: 'clips_delivered_this_week', label: 'Clips delivered', icon: Film },
  { key: 'students_at_risk', label: 'Students at risk', icon: AlertTriangle },
];

export function DashboardSummaryTiles() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    dashboardApi
      .summary()
      .then((res) => {
        if (!cancelled) setData(res);
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

  if (!data) return <LoadingState label="Loading summary…" />;

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      {TILES.map(({ key, label, icon: Icon }) => (
        <Card key={key}>
          <CardContent className="flex flex-col gap-2 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                {label}
              </span>
              <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
            </div>
            <span className="text-3xl font-semibold tabular-nums">
              {data[key]}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
