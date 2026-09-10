'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight, Check, CreditCard, Inbox } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DashboardToday as TodayData, TodayRow } from '@/lib/types';
import { fmtWhen, useBookingActions } from './ledger-row-actions';

/**
 * The cross-client "what needs me now" block. Every row links into that
 * client's workspace; the one-click actions here are the same shared
 * booking actions the workspace ledger uses.
 */
export function DashboardToday({
  today,
  onChanged,
}: {
  today: TodayData;
  onChanged: () => void;
}) {
  const actions = useBookingActions({ onChanged });
  const c = today.counts;
  const attention = c.pending_requests + c.awaiting_payment + c.unlogged_past + c.low_credit_packages;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <span>Today</span>
            <span className="text-xs font-normal text-muted-foreground">
              {today.date ? new Date(`${today.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) : ''}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-5 pt-0">
          {today.sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sessions on the calendar today.</p>
          ) : (
            today.sessions.map((r) => (
              <Row key={r.id} row={r} actions={actions} />
            ))
          )}
        </CardContent>
      </Card>

      <Card className={cn(attention > 0 && 'border-orange-500/50')}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <span>Needs you</span>
            {attention > 0 ? <Badge variant="outline">{attention}</Badge> : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-5 pt-0">
          {attention === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-emerald-400" />
              All clear — nothing pending, nothing unlogged, nothing owed on a session.
            </p>
          ) : null}

          <Group
            icon={<Inbox className="h-4 w-4" />}
            title="Requests to approve"
            rows={today.pending_requests}
            actions={actions}
          />
          <Group
            icon={<AlertTriangle className="h-4 w-4 text-orange-300" />}
            title="Past sessions not logged"
            rows={today.unlogged_past}
            actions={actions}
            markDone
          />
          <Group
            icon={<CreditCard className="h-4 w-4" />}
            title="Awaiting payment"
            rows={today.awaiting_payment}
            actions={actions}
          />

          {today.low_credit_packages.length > 0 ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                Packages running low
              </div>
              {today.low_credit_packages.map((p) => (
                <Link
                  key={p.id}
                  href={`/trainer/students/${p.student_id}?tab=billing`}
                  className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors hover:bg-secondary/40"
                >
                  <span>
                    <span className="font-medium">{p.full_name ?? 'Client'}</span>
                    <span className="text-muted-foreground"> · {p.service_name ?? 'package'}</span>
                  </span>
                  <span className="text-amber-200">
                    {p.sessions_remaining} of {p.total_sessions} left
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Group({
  icon,
  title,
  rows,
  actions,
  markDone = false,
}: {
  icon: React.ReactNode;
  title: string;
  rows: TodayRow[];
  actions: ReturnType<typeof useBookingActions>;
  markDone?: boolean;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
        <span className="opacity-70">{rows.length}</span>
      </div>
      {rows.map((r) => (
        <Row key={r.id} row={r} actions={actions} markDone={markDone} />
      ))}
    </div>
  );
}

function Row({
  row,
  actions,
  markDone = false,
}: {
  row: TodayRow;
  actions: ReturnType<typeof useBookingActions>;
  markDone?: boolean;
}) {
  const href = `/trainer/students/${row.student_id}`;
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm">
      <Link href={href} className="min-w-0 flex-1 hover:underline">
        <span className="font-medium">{row.full_name ?? 'Client'}</span>
        <span className="text-muted-foreground">
          {' '}
          · {fmtWhen(row.scheduled_for)}
          {row.service_name ? ` · ${row.service_name}` : ''}
        </span>
      </Link>
      <div className="flex shrink-0 items-center gap-1">
        {markDone ? (
          <Button
            size="sm"
            disabled={actions.busy}
            onClick={() =>
              void actions.markDone({
                kind: 'scheduled',
                id: row.id,
                student_id: row.student_id,
                starts_at: row.scheduled_for,
                duration_minutes: row.duration_minutes,
              })
            }
          >
            <Check className="h-4 w-4" />
            Done
          </Button>
        ) : (
          <Badge variant="outline" className="font-normal capitalize">
            {row.done === 'requested' ? 'requested' : row.paid.state === 'awaiting' ? 'awaiting' : row.done}
          </Badge>
        )}
        <Button asChild size="sm" variant="ghost">
          <Link href={href} aria-label="Open client">
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
