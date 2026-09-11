'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  Check,
  CircleSlash,
  Copy,
  CreditCard,
  ExternalLink,
  Pencil,
  Repeat,
  ThumbsDown,
  Trash2,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/common/empty-state';
import { cn } from '@/lib/utils';
import type { MarkPaidMethod } from '@/lib/api/calendar';
import type { LedgerDoneState, LedgerPaidState, LedgerRow } from '@/lib/types';
import {
  MarkPaidFields,
  fmtCents,
  fmtWhen,
  type BookingActions,
} from './ledger-row-actions';

// ----------------------------------------------------------------------------
// State chips — the Done and Paid columns
// ----------------------------------------------------------------------------

const DONE_CHIP: Record<LedgerDoneState, { label: string; cls: string }> = {
  requested: { label: 'Requested', cls: 'border-amber-500/50 bg-amber-500/15 text-amber-100' },
  upcoming: { label: 'Upcoming', cls: 'border-sky-500/50 bg-sky-500/15 text-sky-100' },
  unlogged: { label: 'Unlogged', cls: 'border-orange-500/60 bg-orange-500/20 text-orange-100' },
  done: { label: 'Done', cls: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-100' },
  no_show: { label: 'No-show', cls: 'border-amber-500/50 bg-amber-500/15 text-amber-100' },
  cancelled: { label: 'Cancelled', cls: 'border-rose-500/50 bg-rose-500/15 text-rose-200 line-through' },
  declined: { label: 'Declined', cls: 'border-zinc-500/50 bg-zinc-500/15 text-zinc-300 line-through' },
  unknown: { label: '—', cls: 'border-border text-muted-foreground' },
};

const PAID_CHIP: Record<LedgerPaidState, { label: string; cls: string }> = {
  paid: { label: 'Paid', cls: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-100' },
  waived: { label: 'Waived', cls: 'border-zinc-500/50 bg-zinc-500/15 text-zinc-200' },
  awaiting: { label: 'Awaiting', cls: 'border-orange-500/60 bg-orange-500/20 text-orange-100' },
  credit: { label: 'Credit', cls: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-100' },
  free: { label: 'Free', cls: 'border-zinc-500/50 bg-zinc-500/15 text-zinc-200' },
  pending: { label: '—', cls: 'border-border text-muted-foreground' },
  none: { label: '—', cls: 'border-border text-muted-foreground' },
};

function DoneChip({ state }: { state: LedgerDoneState }) {
  const c = DONE_CHIP[state] ?? DONE_CHIP.unknown;
  return (
    <Badge variant="outline" className={cn('font-normal', c.cls)}>
      {c.label}
    </Badge>
  );
}

function PaidChip({ row }: { row: LedgerRow }) {
  const p = row.paid;
  const c = PAID_CHIP[p.state] ?? PAID_CHIP.none;
  const amber = p.state === 'credit' && p.package_unpaid;
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Badge
        variant="outline"
        className={cn(
          'font-normal',
          amber ? 'border-amber-500/60 bg-amber-500/15 text-amber-100' : c.cls,
        )}
      >
        {c.label}
      </Badge>
      {p.state === 'credit' && p.package_name ? (
        <span className="text-xs text-muted-foreground">{p.package_name}</span>
      ) : null}
      {amber ? (
        <span className="text-xs text-amber-200/80">package unpaid</span>
      ) : null}
      {p.state === 'awaiting' || p.state === 'paid' || p.state === 'pending' ? (
        row.price_cents != null && row.price_cents > 0 ? (
          <span className="text-xs text-muted-foreground">{fmtCents(row.price_cents)}</span>
        ) : null
      ) : null}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Filters
// ----------------------------------------------------------------------------

export type LedgerFilter = 'needs' | 'upcoming' | 'past' | 'all';

const FILTER_LABEL: Record<LedgerFilter, string> = {
  needs: 'Needs action',
  upcoming: 'Upcoming',
  past: 'Past',
  all: 'All',
};

function needsAction(r: LedgerRow): boolean {
  return (
    r.done === 'requested' ||
    r.done === 'unlogged' ||
    r.paid.state === 'awaiting'
  );
}

function matches(r: LedgerRow, f: LedgerFilter, now: number): boolean {
  const t = new Date(r.scheduled_for).getTime();
  switch (f) {
    case 'needs':
      return needsAction(r);
    case 'upcoming':
      return t >= now && r.done !== 'cancelled' && r.done !== 'declined';
    case 'past':
      return t < now;
    default:
      return true;
  }
}

// ----------------------------------------------------------------------------
// Ledger
// ----------------------------------------------------------------------------

export function SessionLedger({
  rows,
  actions,
  studentId,
  nowIso,
  initialFilter = 'all',
  onBook,
}: {
  rows: LedgerRow[];
  actions: BookingActions;
  studentId: string;
  /** Server clock at payload time (workspace.generated_at) — keeps render pure. */
  nowIso: string;
  initialFilter?: LedgerFilter;
  onBook?: () => void;
}) {
  const [filter, setFilter] = useState<LedgerFilter>(initialFilter);
  const now = useMemo(() => new Date(nowIso).getTime(), [nowIso]);

  const counts = useMemo(() => {
    const c: Record<LedgerFilter, number> = { needs: 0, upcoming: 0, past: 0, all: rows.length };
    for (const r of rows) {
      if (matches(r, 'needs', now)) c.needs++;
      if (matches(r, 'upcoming', now)) c.upcoming++;
      if (matches(r, 'past', now)) c.past++;
    }
    return c;
  }, [rows, now]);

  const visible = useMemo(() => {
    const list = rows.filter((r) => matches(r, filter, now));
    // Upcoming ascending (soonest first), everything else newest first.
    if (filter === 'upcoming') {
      return [...list].sort(
        (a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime(),
      );
    }
    return list;
  }, [rows, filter, now]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1">
        {(Object.keys(FILTER_LABEL) as LedgerFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs transition-colors',
              filter === f
                ? 'border-primary bg-primary/15 text-foreground'
                : 'border-border text-muted-foreground hover:text-foreground',
              f === 'needs' && counts.needs > 0 && filter !== f
                ? 'border-orange-500/50 text-orange-100'
                : null,
            )}
          >
            {FILTER_LABEL[f]}
            <span className="ml-1 opacity-70">{counts[f]}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={
            filter === 'needs'
              ? 'Nothing needs you'
              : filter === 'upcoming'
                ? 'Nothing booked'
                : 'No sessions yet'
          }
          description={
            filter === 'needs'
              ? 'Every request is answered, every past session is logged, every session is settled.'
              : 'Book the next session or log a walk-in.'
          }
          action={
            onBook ? (
              <Button size="sm" onClick={onBook}>
                Book session
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Service</th>
                <th className="px-3 py-2 font-medium">Done</th>
                <th className="px-3 py-2 font-medium">Paid</th>
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <LedgerRowView key={r.id} row={r} actions={actions} studentId={studentId} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// One row — state cells + inline action panels
// ----------------------------------------------------------------------------

/** ISO → the value an <input type="datetime-local"> wants, in local time. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

type Panel = 'none' | 'approve' | 'markPaidApprove' | 'markPaidSettle' | 'decline' | 'edit';

function LedgerRowView({
  row,
  actions,
  studentId,
}: {
  row: LedgerRow;
  actions: BookingActions;
  studentId: string;
}) {
  const [panel, setPanel] = useState<Panel>('none');
  const [method, setMethod] = useState<MarkPaidMethod>('cash');
  const [payNotes, setPayNotes] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [packageExhausted, setPackageExhausted] = useState(false);
  const [editWhen, setEditWhen] = useState(() => toLocalInput(row.scheduled_for));
  const [editDuration, setEditDuration] = useState(String(row.duration_minutes ?? 60));
  const [editNotes, setEditNotes] = useState(row.notes ?? '');
  const busy = actions.busy;

  const isPending = row.status === 'pending_approval';
  const isAwaiting = row.status === 'awaiting_payment';
  const isOpen = row.status === 'scheduled' || row.status === 'confirmed';
  const isDone = row.status === 'completed';

  function reset() {
    setPanel('none');
    setPayNotes('');
    setDeclineReason('');
    setPackageExhausted(false);
  }

  async function approve(body: Parameters<BookingActions['approve']>[1]) {
    const result = await actions.approve(row.id, body);
    if (result === 'exhausted') {
      setPackageExhausted(true);
      setPanel('approve');
    } else if (result === 'ok') {
      reset();
    }
  }

  const logHref = `/trainer/sessions/new?${new URLSearchParams({
    studentId,
    date: row.scheduled_for.slice(0, 10),
    scheduledSessionId: row.id,
  }).toString()}`;

  return (
    <>
      <tr className={cn('border-t border-border', row.done === 'unlogged' && 'bg-orange-500/5')}>
        <td className="whitespace-nowrap px-3 py-2 align-top">
          <div>{fmtWhen(row.scheduled_for)}</div>
          <div className="text-xs text-muted-foreground">
            {row.duration_minutes ? `${row.duration_minutes} min` : ''}
          </div>
        </td>
        <td className="px-3 py-2 align-top">{row.service_name ?? '—'}</td>
        <td className="px-3 py-2 align-top">
          <DoneChip state={row.done} />
          {row.decline_reason ? (
            <div className="mt-1 text-xs text-muted-foreground">{row.decline_reason}</div>
          ) : null}
          {row.cancellation_reason ? (
            <div className="mt-1 text-xs text-muted-foreground">{row.cancellation_reason}</div>
          ) : null}
        </td>
        <td className="px-3 py-2 align-top">
          <PaidChip row={row} />
        </td>
        <td className="px-3 py-2 align-top">
          <div className="flex flex-wrap justify-end gap-1">
            {isPending && panel === 'none' ? (
              <>
                <Button size="sm" disabled={busy} onClick={() => setPanel('approve')}>
                  <Check className="h-4 w-4" />
                  Approve
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => setPanel('decline')}>
                  <ThumbsDown className="h-4 w-4" />
                  Decline
                </Button>
              </>
            ) : null}

            {isAwaiting && panel === 'none' ? (
              <>
                <Button size="sm" disabled={busy} onClick={() => setPanel('markPaidSettle')}>
                  <CreditCard className="h-4 w-4" />
                  Mark paid
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => void actions.waivePayment(row.id)}>
                  Waive
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => void actions.copyPayLink(row.id)}>
                  <Copy className="h-4 w-4" />
                  Pay link
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => void actions.setStatus(row.id, 'cancelled')}>
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : null}

            {isOpen ? (
              <>
                <Button
                  size="sm"
                  disabled={busy}
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
                  Mark done
                </Button>
                <Button asChild size="sm" variant="outline" disabled={busy}>
                  <Link href={logHref}>Log details</Link>
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => void actions.setStatus(row.id, 'no_show')}>
                  <CircleSlash className="h-4 w-4" />
                  No-show
                </Button>
                {row.done === 'upcoming' ? (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => void actions.remind(row.id)} title="Remind client">
                    <Bell className="h-4 w-4" />
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  title="Move this session"
                  onClick={() => setPanel(panel === 'edit' ? 'none' : 'edit')}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  title="Book the same slot next week"
                  onClick={() => void actions.repeatNextWeek(row)}
                >
                  <Repeat className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => void actions.setStatus(row.id, 'cancelled')} title="Cancel">
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : null}

            {isDone ? (
              <>
                {row.fulfilled_session_id ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/trainer/sessions/${row.fulfilled_session_id}`}>
                      <ExternalLink className="h-4 w-4" />
                      View log
                    </Link>
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  title="Book the same slot next week"
                  onClick={() => void actions.repeatNextWeek(row)}
                >
                  <Repeat className="h-4 w-4" />
                  Next week
                </Button>
              </>
            ) : null}

            {row.status === 'cancelled' || row.status === 'declined' || row.status === 'no_show' ? (
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => void actions.deleteBooking(row.id)}
                className="text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </td>
      </tr>

      {panel !== 'none' ? (
        <tr className="border-t border-border/60 bg-background/40">
          <td colSpan={5} className="px-3 py-3">
            <div className="ml-auto max-w-md space-y-2">
              {panel === 'approve' ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">How is this one settled?</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" disabled={busy} onClick={() => void approve({})}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => void approve({ waive_payment: true })}>
                      Approve + waive
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => setPanel('markPaidApprove')}>
                      Approve + mark paid…
                    </Button>
                    {packageExhausted ? (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => void approve({ drop_package: true })}>
                        Approve as drop-in (package is empty)
                      </Button>
                    ) : null}
                    <Button size="sm" variant="ghost" disabled={busy} onClick={reset}>
                      Back
                    </Button>
                  </div>
                </div>
              ) : null}

              {panel === 'markPaidApprove' ? (
                <MarkPaidFields
                  idPrefix={`approve-pay-${row.id}`}
                  method={method}
                  onMethod={setMethod}
                  notes={payNotes}
                  onNotes={setPayNotes}
                  busy={busy}
                  submitLabel="Approve + mark paid"
                  onSubmit={() =>
                    void approve({
                      mark_paid: { method, ...(payNotes.trim() ? { notes: payNotes.trim() } : {}) },
                    })
                  }
                  onBack={() => setPanel('approve')}
                />
              ) : null}

              {panel === 'markPaidSettle' ? (
                <MarkPaidFields
                  idPrefix={`settle-pay-${row.id}`}
                  method={method}
                  onMethod={setMethod}
                  notes={payNotes}
                  onNotes={setPayNotes}
                  busy={busy}
                  submitLabel="Mark paid"
                  onSubmit={() => {
                    void actions.markPaid(row.id, method, payNotes).then(reset);
                  }}
                  onBack={reset}
                />
              ) : null}

              {panel === 'edit' ? (
                <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                  <div className="space-y-2">
                    <Label htmlFor={`edit-when-${row.id}`}>When</Label>
                    <Input
                      id={`edit-when-${row.id}`}
                      type="datetime-local"
                      value={editWhen}
                      onChange={(e) => setEditWhen(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`edit-dur-${row.id}`}>Minutes</Label>
                    <Input
                      id={`edit-dur-${row.id}`}
                      type="number"
                      min={15}
                      max={480}
                      className="w-24"
                      value={editDuration}
                      onChange={(e) => setEditDuration(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor={`edit-notes-${row.id}`}>Notes</Label>
                    <Input
                      id={`edit-notes-${row.id}`}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="optional"
                    />
                  </div>
                  <div className="flex gap-2 md:col-span-2">
                    <Button
                      size="sm"
                      disabled={busy || !editWhen}
                      onClick={() => {
                        void actions
                          .reschedule(row.id, {
                            scheduled_for: new Date(editWhen).toISOString(),
                            duration_minutes: Number(editDuration) || row.duration_minutes,
                            ...(editNotes.trim() ? { notes: editNotes.trim() } : {}),
                          })
                          .then((ok) => {
                            if (ok) reset();
                          });
                      }}
                    >
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" disabled={busy} onClick={reset}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}

              {panel === 'decline' ? (
                <div className="space-y-2">
                  <Label htmlFor={`decline-${row.id}`}>Reason (optional)</Label>
                  <Textarea
                    id={`decline-${row.id}`}
                    rows={2}
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    placeholder="Booked solid that morning — try Thursday?"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy}
                      onClick={() => {
                        void actions.decline(row.id, declineReason).then(reset);
                      }}
                    >
                      Decline request
                    </Button>
                    <Button size="sm" variant="ghost" disabled={busy} onClick={reset}>
                      Back
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
