'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingState } from '@/components/common/loading-state';
import { EmptyState } from '@/components/common/empty-state';
import { dashboardApi } from '@/lib/api/dashboard';
import { describeApiError } from '@/lib/api';
import { formatRelative } from '@/lib/utils';
import type { InactivityAlert } from '@/lib/types';

export function InactivityAlertsList() {
  const [alerts, setAlerts] = useState<InactivityAlert[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    dashboardApi
      .inactivityAlerts()
      .then((res) => {
        if (!cancelled) setAlerts(res);
      })
      .catch((err: unknown) => toast.error(describeApiError(err)));
    return () => {
      cancelled = true;
    };
  }, []);

  async function resolve(alertId: string) {
    setBusy(alertId);
    try {
      await dashboardApi.resolveAlert(alertId, {});
      setAlerts((prev) => (prev ?? []).filter((a) => a.id !== alertId));
      toast.success('Alert resolved.');
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setBusy(null);
    }
  }

  if (!alerts) return <LoadingState label="Loading alerts…" />;
  if (alerts.length === 0) {
    return (
      <EmptyState
        icon={<CheckCircle2 className="h-8 w-8" />}
        title="No active alerts"
        description="Quiet is good. Inactive students will surface here as soon as the watcher catches them."
      />
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((a) => (
        <Card key={a.id}>
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <AlertTriangle
              className="h-5 w-5 text-destructive"
              aria-hidden
            />
            <div className="flex-1 min-w-[200px]">
              <Link
                href={`/trainer/students/${a.student_id}`}
                className="text-sm font-medium hover:underline"
              >
                {a.student_name ?? `Student ${a.student_id.slice(0, 8)}…`}
              </Link>
              <div className="text-xs text-muted-foreground">
                Flagged {formatRelative(a.flagged_at)}
                {typeof a.days_inactive === 'number'
                  ? ` · ${a.days_inactive} days since last session`
                  : ''}
                {a.reason ? ` · ${a.reason}` : ''}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => resolve(a.id)}
              disabled={busy === a.id}
            >
              {busy === a.id ? 'Resolving…' : 'Mark resolved'}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
