'use client';

import { Bell, CalendarPlus, Check, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { StudentWorkspace } from '@/lib/types';
import { fmtCents, fmtWhen, type BookingActions } from './ledger-row-actions';

/**
 * The three numbers a coach needs before anything else about a client:
 * when they're next in, where the money stands, and what needs a decision.
 */
export function ClientHeaderStrip({
  ws,
  actions,
  onBook,
  onTakePayment,
  onReview,
}: {
  ws: StudentWorkspace;
  actions: BookingActions;
  onBook: () => void;
  onTakePayment: () => void;
  onReview: () => void;
}) {
  const next = ws.next_session;
  const needs = ws.needs_attention;
  const needsTotal =
    needs.pending_requests + needs.awaiting_payment + needs.unlogged_past + needs.low_credit_packages;
  const owed = ws.balance.owed_cents.total;
  // Server-derived: 'unlogged' means locked, in the past, no session yet.
  const nextIsPast = next?.done === 'unlogged';

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {/* Next session */}
      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Next session</div>
          {next ? (
            <>
              <div className="text-lg font-semibold leading-tight">{fmtWhen(next.scheduled_for)}</div>
              <div className="text-sm text-muted-foreground">
                {next.service_name ?? 'Session'}
                {next.paid.state === 'credit' ? ' · via package' : null}
                {next.paid.state === 'paid' ? ' · paid' : null}
                {next.paid.state === 'waived' ? ' · waived' : null}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {nextIsPast ? (
                  <Button
                    size="sm"
                    disabled={actions.busy}
                    onClick={() =>
                      void actions.markDone({
                        kind: 'scheduled',
                        id: next.id,
                        student_id: next.student_id,
                        starts_at: next.scheduled_for,
                        duration_minutes: next.duration_minutes,
                      })
                    }
                  >
                    <Check className="h-4 w-4" />
                    Mark done
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" disabled={actions.busy} onClick={() => void actions.remind(next.id)}>
                    <Bell className="h-4 w-4" />
                    Remind
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="text-lg font-semibold leading-tight text-muted-foreground">Nothing booked</div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={onBook}>
                  <CalendarPlus className="h-4 w-4" />
                  Book
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Balance */}
      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Balance</div>
          <div className="text-lg font-semibold leading-tight">
            {ws.balance.credits_total > 0
              ? `${ws.balance.credits_remaining} of ${ws.balance.credits_total} credits left`
              : 'No active package'}
          </div>
          <div className={cn('text-sm', owed > 0 ? 'text-amber-200' : 'text-muted-foreground')}>
            {owed > 0 ? `${fmtCents(owed)} owed` : 'Nothing owed'}
            {owed > 0 && ws.balance.owed_cents.packages > 0 ? ' · package' : null}
            {owed > 0 && ws.balance.owed_cents.invoices > 0 ? ' · invoice' : null}
            {owed > 0 && ws.balance.owed_cents.sessions > 0 ? ' · session' : null}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant={next ? 'outline' : 'ghost'} onClick={onBook}>
              <CalendarPlus className="h-4 w-4" />
              Book
            </Button>
            <Button size="sm" variant="outline" onClick={onTakePayment}>
              <Receipt className="h-4 w-4" />
              {owed > 0 ? 'Take payment' : 'Billing'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Needs you */}
      <Card className={cn(needsTotal > 0 && 'border-orange-500/50')}>
        <CardContent className="space-y-2 p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Needs you</div>
          {needsTotal === 0 ? (
            <div className="text-lg font-semibold leading-tight text-muted-foreground">All clear</div>
          ) : (
            <ul className="space-y-0.5 text-sm">
              {needs.pending_requests > 0 ? (
                <li>
                  <strong>{needs.pending_requests}</strong> request{needs.pending_requests === 1 ? '' : 's'} pending
                </li>
              ) : null}
              {needs.unlogged_past > 0 ? (
                <li className="text-orange-100">
                  <strong>{needs.unlogged_past}</strong> session{needs.unlogged_past === 1 ? '' : 's'} unlogged
                </li>
              ) : null}
              {needs.awaiting_payment > 0 ? (
                <li>
                  <strong>{needs.awaiting_payment}</strong> awaiting payment
                </li>
              ) : null}
              {needs.low_credit_packages > 0 ? (
                <li className="text-amber-200">
                  Package low — time to re-up
                </li>
              ) : null}
            </ul>
          )}
          {needsTotal > 0 ? (
            <div className="pt-1">
              <Button size="sm" variant="outline" onClick={onReview}>
                Review
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
