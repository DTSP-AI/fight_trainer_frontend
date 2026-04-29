'use client';

import { useEffect, useState } from 'react';
import { LoadingState } from '@/components/common/loading-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { studentPortalApi } from '@/lib/api/student-portal';
import { billingApi, type PackageRow } from '@/lib/api/billing';
import { describeApiError } from '@/lib/api';
import type { Session, Student } from '@/lib/types';

function fmtCents(c: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(c / 100);
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

export default function StudentSessionsPage() {
  const [me, setMe] = useState<Student | null>(null);
  const [packages, setPackages] = useState<PackageRow[] | null>(null);
  const [history, setHistory] = useState<Session[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meRes = await studentPortalApi.me();
        if (cancelled) return;
        setMe(meRes);
        const [pkgs, sess] = await Promise.all([
          billingApi.listPackages(meRes.id),
          studentPortalApi.mySessions(50),
        ]);
        if (cancelled) return;
        setPackages(pkgs);
        setHistory(sess);
      } catch (err) {
        if (!cancelled) setError(describeApiError(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        {error}
      </p>
    );
  }
  if (!me || !packages || !history) {
    return <LoadingState label="Loading your sessions…" />;
  }

  const activePackages = packages.filter((p) => p.status === 'active');
  const remainingTotal = activePackages.reduce(
    (sum, p) => sum + p.sessions_remaining,
    0,
  );
  const totalLogged = history.length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Sessions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What you've got left, what you've used.
        </p>
      </div>

      {/* Big numbers */}
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-1 py-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Sessions remaining
            </p>
            <p className="text-4xl font-semibold tracking-tight">
              {remainingTotal}
            </p>
            <p className="text-xs text-muted-foreground">
              across {activePackages.length} active package
              {activePackages.length === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 py-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Sessions logged
            </p>
            <p className="text-4xl font-semibold tracking-tight">
              {totalLogged}
            </p>
            <p className="text-xs text-muted-foreground">
              total in your history
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active packages detail */}
      {activePackages.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active packages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activePackages.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background/40 p-3"
              >
                <div className="text-sm">
                  <span className="font-semibold">
                    {p.sessions_remaining}
                  </span>{' '}
                  / {p.total_sessions} left ·{' '}
                  {fmtCents(p.price_per_session_cents)}/session
                </div>
                <Badge
                  variant={p.payment_status === 'paid' ? 'default' : 'secondary'}
                >
                  {p.payment_status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* Recent history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sessions logged yet.
            </p>
          ) : (
            history.slice(0, 20).map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/40 p-3 text-sm"
              >
                <span>{fmtDate(s.session_date)}</span>
                <span className="text-xs text-muted-foreground">
                  {s.duration_minutes
                    ? `${s.duration_minutes} min`
                    : ''}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
