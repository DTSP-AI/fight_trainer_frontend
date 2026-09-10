'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleSlash,
  CreditCard,
  Dumbbell,
  Pencil,
  ThumbsDown,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AssistedTextarea } from '@/components/common/assisted-textarea';
import { ScheduleLegend } from '@/components/common/schedule-legend';
import { cn } from '@/lib/utils';
import {
  billingApi,
  type PackageRow,
} from '@/lib/api/billing';
import {
  type ApproveBody,
  type AvailableSlot,
  type CalendarEvent,
  type MarkPaidMethod,
  type PlannedEvent,
  type ScheduledEvent,
} from '@/lib/api/calendar';
import { plansApi } from '@/lib/api/plans';
import { describeApiError } from '@/lib/api';
import { MarkPaidFields, useBookingActions } from './ledger-row-actions';
import {
  STATUS_LABEL,
  TONES,
  eventTone,
  type ScheduleTone,
} from '@/lib/schedule-tones';
import type { Student } from '@/lib/types';

// ============================================================================
// Date helpers — native Date, no library
// ============================================================================

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function localDateKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function buildMonthGrid(monthAnchor: Date): Date[] {
  const start = startOfMonth(monthAnchor);
  const offset = start.getDay();
  const gridStart = new Date(start);
  gridStart.setDate(1 - offset);
  const out: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    out.push(d);
  }
  return out;
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function fmtWhenFull(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function fmtCents(c: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(c / 100);
}

// ============================================================================
// Visual tokens
// ============================================================================

// Colour tokens live in lib/schedule-tones.ts — shared with the client
// calendar so the two roles read the same board.

function eventClass(ev: CalendarEvent): string {
  return TONES[eventTone(ev)];
}

const TRAINER_LEGEND: ScheduleTone[] = [
  'available',
  'pending_approval',
  'awaiting_payment',
  'scheduled',
  'completed',
  'no_show',
  'cancelled',
  'planned',
];

const STUDENT_LEGEND: ScheduleTone[] = TRAINER_LEGEND;

/** Only the fields this calendar reads off a service row. */
interface ServiceLite {
  id: string;
  name: string;
}

function eventLabel(ev: CalendarEvent, student?: Student): string {
  const name = student?.full_name ?? '(unknown)';
  if (ev.kind === 'planned') {
    return `${ev.session_type ?? 'plan'} · ${name}`;
  }
  return `${fmtTime(ev.starts_at)} ${name}`;
}

// ============================================================================
// SessionsCalendar
// ============================================================================

interface Props {
  events: CalendarEvent[];
  studentMap: Map<string, Student>;
  serviceMap: Map<string, ServiceLite>;
  packageMap: Map<string, PackageRow>;
  onChanged: () => void;
  /** Called when a day cell is clicked — host should open its schedule
   *  form pre-filled with the picked datetime (default 12:00 PM local). */
  onPickDay?: (datetime: string) => void;
  /** Open coach availability, rendered as dashed emerald chips. */
  availableSlots?: AvailableSlot[];
  /** 'student' hides every coach action and shows the client-side ones. */
  mode?: 'trainer' | 'student';
  onPickSlot?: (slot: AvailableSlot) => void;
  onPay?: (ev: ScheduledEvent) => void;
  onCancelRequest?: (ev: ScheduledEvent) => void;
}

export function SessionsCalendar({
  events,
  studentMap,
  serviceMap,
  packageMap,
  onChanged,
  onPickDay,
  availableSlots,
  mode = 'trainer',
  onPickSlot,
  onPay,
  onCancelRequest,
}: Props) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState<Date>(() => startOfMonth(today));
  const [selected, setSelected] = useState<CalendarEvent | null>(null);

  const grid = useMemo(() => buildMonthGrid(cursor), [cursor]);

  const slotsByDate = useMemo(() => {
    const m = new Map<string, AvailableSlot[]>();
    for (const slot of availableSlots ?? []) {
      const key = localDateKey(new Date(slot.starts_at));
      const arr = m.get(key) ?? [];
      arr.push(slot);
      m.set(key, arr);
    }
    for (const arr of m.values()) {
      arr.sort(
        (a, b) =>
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      );
    }
    return m;
  }, [availableSlots]);

  const byDate = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const key = localDateKey(new Date(ev.starts_at));
      const arr = m.get(key) ?? [];
      arr.push(ev);
      m.set(key, arr);
    }
    for (const arr of m.values()) {
      arr.sort(
        (a, b) =>
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      );
    }
    return m;
  }, [events]);

  function handleDayClick(d: Date) {
    if (!onPickDay) return;
    const dt = new Date(d);
    dt.setHours(12, 0, 0, 0);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    const hh = String(dt.getHours()).padStart(2, '0');
    const mi = String(dt.getMinutes()).padStart(2, '0');
    onPickDay(`${yyyy}-${mm}-${dd}T${hh}:${mi}`);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCursor((c) => addMonths(c, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCursor(startOfMonth(today))}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCursor((c) => addMonths(c, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h3 className="text-lg font-semibold tracking-tight">
          {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}
        </h3>
        <ScheduleLegend
          items={mode === 'student' ? STUDENT_LEGEND : TRAINER_LEGEND}
        />
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {grid.map((d) => {
          const key = localDateKey(d);
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = isSameDay(d, today);
          const eventsToday = byDate.get(key) ?? [];
          const visible = eventsToday.slice(0, 3);
          const overflow = eventsToday.length - visible.length;
          const slotsToday = slotsByDate.get(key) ?? [];
          const visibleSlots = slotsToday.slice(0, 3);
          const slotOverflow = slotsToday.length - visibleSlots.length;

          return (
            <div
              key={key}
              onClick={() => handleDayClick(d)}
              className={cn(
                'group min-h-[88px] cursor-pointer rounded-md border border-border/60 bg-background/30 p-1.5 text-xs transition-colors hover:bg-background/60',
                !inMonth && 'opacity-40',
                isToday && 'border-primary/60 ring-1 ring-primary/40',
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cn(
                    'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[11px] font-medium',
                    isToday && 'bg-primary text-primary-foreground',
                  )}
                >
                  {d.getDate()}
                </span>
                {eventsToday.length > 0 ? (
                  <span className="text-[10px] text-muted-foreground">
                    {eventsToday.length}
                  </span>
                ) : null}
              </div>
              <div className="space-y-1">
                {visible.map((ev) => {
                  const stu = studentMap.get(ev.student_id);
                  return (
                    <button
                      key={`${ev.kind}-${ev.id}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(ev);
                      }}
                      className={cn(
                        'flex w-full items-center gap-1 truncate rounded-sm px-1.5 py-0.5 text-left text-[11px]',
                        eventClass(ev),
                      )}
                      title={eventLabel(ev, stu)}
                    >
                      {ev.kind === 'planned' ? (
                        <Dumbbell className="h-3 w-3 shrink-0" />
                      ) : null}
                      <span className="truncate">{eventLabel(ev, stu)}</span>
                    </button>
                  );
                })}
                {overflow > 0 ? (
                  <div className="text-[10px] text-muted-foreground">
                    +{overflow} more
                  </div>
                ) : null}
                {visibleSlots.map((slot) => (
                  <button
                    key={`slot-${slot.starts_at}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPickSlot?.(slot);
                    }}
                    className={cn(
                      'flex w-full items-center gap-1 truncate rounded-sm px-1.5 py-0.5 text-left text-[11px]',
                      TONES.available,
                      !onPickSlot && 'cursor-default',
                    )}
                    title={`${fmtTime(slot.starts_at)} available`}
                  >
                    <span className="truncate">
                      {fmtTime(slot.starts_at)} Available
                    </span>
                  </button>
                ))}
                {slotOverflow > 0 ? (
                  <div className="text-[10px] text-emerald-200/70">
                    +{slotOverflow} more open
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <EventDetailDialog
        event={selected}
        student={selected ? studentMap.get(selected.student_id) : undefined}
        service={
          selected?.kind === 'scheduled' && selected.service_id
            ? serviceMap.get(selected.service_id)
            : undefined
        }
        pkg={
          selected?.kind === 'scheduled' && selected.package_id
            ? packageMap.get(selected.package_id)
            : undefined
        }
        mode={mode}
        onClose={() => setSelected(null)}
        onChanged={() => {
          setSelected(null);
          onChanged();
        }}
        onPay={onPay}
        onCancelRequest={onCancelRequest}
      />
    </div>
  );
}

// ============================================================================
// Event detail dialog — different actions for scheduled vs planned
// ============================================================================

type Panel =
  | 'none'
  | 'approve'
  | 'decline'
  | 'markPaidApprove'
  | 'markPaidSettle';

/** One line summarising where the money stands on a scheduled session. */
function paymentLine(s: ScheduledEvent): string | null {
  if (s.payment_waived_at) return 'Payment waived';
  if (s.paid_at) return `Paid · ${fmtWhenFull(s.paid_at)}`;
  if (s.package_id) return 'Package credit';
  if (s.status === 'awaiting_payment') return 'Awaiting payment';
  if (s.price_cents === 0) return 'No charge';
  return null;
}

/** Plain-language "what happens next" for the client-side dialog. */
function studentNextStep(s: ScheduledEvent): string {
  switch (s.status) {
    case 'pending_approval':
      return 'Requested. Your coach still has to approve it — nothing is locked in yet.';
    case 'awaiting_payment':
      return 'Your coach approved it. Settle the payment and the spot is locked in.';
    case 'scheduled':
    case 'confirmed':
      return "You're locked in. See you on the mats.";
    case 'declined':
      return 'Your coach declined this request. Pick another open spot.';
    case 'cancelled':
      return 'This session was cancelled.';
    case 'no_show':
      return 'Marked as a no-show.';
    case 'completed':
      return 'Logged.';
    default:
      return '';
  }
}

function EventDetailDialog({
  event,
  student,
  service,
  pkg,
  mode = 'trainer',
  onClose,
  onChanged,
  onPay,
  onCancelRequest,
}: {
  event: CalendarEvent | null;
  student?: Student;
  service?: ServiceLite;
  pkg?: PackageRow;
  mode?: 'trainer' | 'student';
  onClose: () => void;
  onChanged: () => void;
  onPay?: (ev: ScheduledEvent) => void;
  onCancelRequest?: (ev: ScheduledEvent) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [panel, setPanel] = useState<Panel>('none');
  const [method, setMethod] = useState<MarkPaidMethod>('cash');
  const [payNotes, setPayNotes] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [packageExhausted, setPackageExhausted] = useState(false);
  // One implementation of every coach action — shared with the session
  // ledger on the Client Workspace so the two can never disagree.
  const actions = useBookingActions({ onChanged, studentName: student?.full_name });
  const busy = actions.busy;

  if (!event) return null;

  const isTrainer = mode !== 'student';
  const scheduled = event.kind === 'scheduled' ? (event as ScheduledEvent) : null;
  const planned = event.kind === 'planned' ? (event as PlannedEvent) : null;
  const status = scheduled?.status ?? null;
  const isPending = status === 'pending_approval';
  const isAwaitingPayment = status === 'awaiting_payment';
  const inBookingFlow = isPending || isAwaitingPayment || status === 'declined';

  function resetPanels() {
    setPanel('none');
    setDeclineReason('');
    setPayNotes('');
    setPackageExhausted(false);
  }

  async function setStatus(next: 'no_show' | 'cancelled') {
    if (!scheduled) return;
    await actions.setStatus(scheduled.id, next);
  }

  async function approve(body: ApproveBody) {
    if (!scheduled) return;
    const result = await actions.approve(scheduled.id, body);
    if (result === 'exhausted') {
      setPackageExhausted(true);
      setPanel('approve');
    } else if (result === 'ok') {
      resetPanels();
    }
  }

  async function decline() {
    if (!scheduled) return;
    await actions.decline(scheduled.id, declineReason);
    resetPanels();
  }

  async function waivePayment() {
    if (!scheduled) return;
    await actions.waivePayment(scheduled.id);
    resetPanels();
  }

  async function markPaid() {
    if (!scheduled) return;
    await actions.markPaid(scheduled.id, method, payNotes);
    resetPanels();
  }

  async function remind() {
    if (!scheduled) return;
    await actions.remind(scheduled.id);
  }

  async function markDone() {
    if (!event) return;
    await actions.markDone({
      kind: event.kind,
      id: event.id,
      student_id: event.student_id,
      starts_at: event.starts_at,
      duration_minutes: event.duration_minutes,
    });
  }

  async function deleteEvent() {
    if (!event) return;
    if (event.kind === 'scheduled') {
      await actions.deleteBooking(event.id);
      return;
    }
    if (!window.confirm('Delete this plan item? This cannot be undone.')) return;
    try {
      await plansApi.deletePlannedSession(event.id);
      toast.success('Deleted');
      onChanged();
    } catch (err) {
      toast.error(describeApiError(err));
    }
  }

  function logSession() {
    // Optional path — full log form runs the AI pipeline.
    const dateOnly = event!.starts_at.slice(0, 10);
    const params = new URLSearchParams({
      studentId: event!.student_id,
      date: dateOnly,
    });
    if (scheduled) params.set('scheduledSessionId', scheduled.id);
    if (planned) params.set('plannedSessionId', planned.id);
    router.push(`/trainer/sessions/new?${params.toString()}`);
  }

  const isOpenScheduled =
    scheduled && (scheduled.status === 'scheduled' || scheduled.status === 'confirmed');
  const planAlreadyDone = planned && planned.fulfilled_session_id;
  const payLine = scheduled ? paymentLine(scheduled) : null;
  const showEverydayActions =
    isTrainer &&
    !inBookingFlow &&
    !event.fulfilled_session_id &&
    !planAlreadyDone;

  return (
    <Dialog
      open={!!event}
      onOpenChange={(o) => {
        if (!o) {
          setEditing(false);
          resetPanels();
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {student?.full_name ?? '(unknown student)'}
          </DialogTitle>
          <DialogDescription>
            {fmtWhenFull(event.starts_at)}
            {event.duration_minutes ? ` · ${event.duration_minutes}m` : ''}
          </DialogDescription>
        </DialogHeader>

        {editing && scheduled ? (
          <EditScheduledForm
            scheduled={scheduled}
            studentId={event.student_id}
            onSaved={() => {
              setEditing(false);
              onChanged();
            }}
            onCancel={() => setEditing(false)}
          />
        ) : null}

        {!editing ? (
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            {scheduled ? (
              <>
                <Badge variant="secondary">
                  {STATUS_LABEL[eventTone(scheduled)]}
                </Badge>
                {service ? (
                  <Badge variant="outline">{service.name}</Badge>
                ) : null}
                <Badge variant="outline">
                  {pkg
                    ? `Package ${pkg.sessions_remaining}/${pkg.total_sessions}`
                    : 'Drop-in'}
                </Badge>
                {scheduled.price_cents != null ? (
                  <Badge variant="outline">
                    {fmtCents(scheduled.price_cents)}
                  </Badge>
                ) : null}
                {scheduled.fulfilled_session_id ? (
                  <Badge variant="default">Logged</Badge>
                ) : null}
              </>
            ) : null}
            {planned ? (
              <>
                <Badge variant="secondary">Plan item</Badge>
                {planned.session_type ? (
                  <Badge variant="outline" className="capitalize">
                    {planned.session_type}
                  </Badge>
                ) : null}
                {planned.plan_focus ? (
                  <Badge variant="outline">{planned.plan_focus}</Badge>
                ) : null}
                {planAlreadyDone ? (
                  <Badge variant="default">Logged</Badge>
                ) : (
                  <Badge variant="outline">Not yet logged</Badge>
                )}
              </>
            ) : null}
          </div>
          {payLine ? (
            <p className="text-xs text-muted-foreground">{payLine}</p>
          ) : null}
          {scheduled?.decline_reason ? (
            <p className="text-xs text-muted-foreground">
              Reason: {scheduled.decline_reason}
            </p>
          ) : null}
          {scheduled?.cancellation_reason ? (
            <p className="text-xs text-muted-foreground">
              Cancelled: {scheduled.cancellation_reason}
            </p>
          ) : null}
          {!isTrainer && scheduled ? (
            <p className="rounded-md border border-border bg-background/40 p-3 text-xs text-muted-foreground">
              {studentNextStep(scheduled)}
            </p>
          ) : null}
          {event.notes ? (
            <p className="rounded-md border border-border bg-background/40 p-3 text-xs italic text-muted-foreground">
              {event.notes}
            </p>
          ) : null}
        </div>
        ) : null}

        {/* ── Coach booking actions ── */}
        {!editing && isTrainer && scheduled && isPending ? (
          <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
            {panel === 'none' ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => setPanel('approve')}
                >
                  <Check className="h-4 w-4" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setPanel('decline')}
                >
                  <ThumbsDown className="h-4 w-4" />
                  Decline
                </Button>
              </div>
            ) : null}

            {panel === 'approve' ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  How is this one settled?
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => void approve({})}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void approve({ waive_payment: true })}
                  >
                    Approve + waive payment
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => setPanel('markPaidApprove')}
                  >
                    Approve + mark paid…
                  </Button>
                  {packageExhausted ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void approve({ drop_package: true })}
                    >
                      Approve as drop-in (package is empty)
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => setPanel('none')}
                  >
                    Back
                  </Button>
                </div>
              </div>
            ) : null}

            {panel === 'markPaidApprove' ? (
              <MarkPaidFields
                method={method}
                onMethod={setMethod}
                notes={payNotes}
                onNotes={setPayNotes}
                busy={busy}
                submitLabel="Approve + mark paid"
                onSubmit={() =>
                  void approve({
                    mark_paid: {
                      method,
                      ...(payNotes.trim() ? { notes: payNotes.trim() } : {}),
                    },
                  })
                }
                onBack={() => setPanel('approve')}
              />
            ) : null}

            {panel === 'decline' ? (
              <div className="space-y-2">
                <Label htmlFor="decline-reason">Reason (optional)</Label>
                <Textarea
                  id="decline-reason"
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
                    onClick={() => void decline()}
                  >
                    Decline request
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => setPanel('none')}
                  >
                    Back
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {!editing && isTrainer && scheduled && isAwaitingPayment ? (
          <div className="space-y-2 rounded-md border border-orange-500/40 bg-orange-500/5 p-3">
            {panel === 'markPaidSettle' ? (
              <MarkPaidFields
                method={method}
                onMethod={setMethod}
                notes={payNotes}
                onNotes={setPayNotes}
                busy={busy}
                submitLabel="Mark paid"
                onSubmit={() => void markPaid()}
                onBack={() => setPanel('none')}
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => setPanel('markPaidSettle')}
                >
                  <CreditCard className="h-4 w-4" />
                  Mark paid
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void waivePayment()}
                >
                  Waive payment
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void setStatus('cancelled')}
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            )}
          </div>
        ) : null}

        {/* ── Client actions ── */}
        {!editing && !isTrainer && scheduled ? (
          <div className="flex flex-wrap gap-2">
            {isAwaitingPayment && onPay ? (
              <Button disabled={busy} onClick={() => onPay(scheduled)}>
                <CreditCard className="h-4 w-4" />
                Pay now
              </Button>
            ) : null}
            {(isPending || isAwaitingPayment) && onCancelRequest ? (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => onCancelRequest(scheduled)}
              >
                <X className="h-4 w-4" />
                Cancel request
              </Button>
            ) : null}
          </div>
        ) : null}

        {!editing ? (
        <DialogFooter className="flex-col gap-2 sm:flex-col sm:items-stretch">
          {/* Primary action row — Mark Done is the everyday path. */}
          {showEverydayActions ? (
            <div className="flex flex-wrap gap-2">
              <Button onClick={markDone} disabled={busy} className="flex-1">
                <Check className="h-4 w-4" />
                Mark done
              </Button>
              {isOpenScheduled ? (
                <>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => void setStatus('no_show')}
                  >
                    <CircleSlash className="h-4 w-4" />
                    No-show
                  </Button>
                  <Button variant="outline" disabled={busy} onClick={remind}>
                    <Bell className="h-4 w-4" />
                    Remind
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void setStatus('cancelled')}
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </>
              ) : null}
            </div>
          ) : (
            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          )}

          {/* Optional — only when the trainer wants AI insights. */}
          {showEverydayActions ? (
            <button
              type="button"
              onClick={logSession}
              disabled={busy}
              className="text-xs text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
            >
              or log full session details (runs the analysis pipeline) →
            </button>
          ) : null}

          {/* Edit + delete row — coach only. Edit only on scheduled. */}
          {isTrainer ? (
            <div className="flex justify-end gap-2">
              {scheduled ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={deleteEvent}
                className="text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          ) : null}
        </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EditScheduledForm({
  scheduled,
  studentId,
  onSaved,
  onCancel,
}: {
  scheduled: ScheduledEvent;
  studentId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  // Convert ISO timestamp to the value an <input type="datetime-local"> wants.
  const initialLocal = (() => {
    try {
      const d = new Date(scheduled.starts_at);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
    } catch {
      return '';
    }
  })();

  const [scheduledFor, setScheduledFor] = useState(initialLocal);
  const [duration, setDuration] = useState(
    String(scheduled.duration_minutes ?? 60),
  );
  const [notes, setNotes] = useState((scheduled as ScheduledEvent & { notes?: string | null }).notes ?? '');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await billingApi.updateSchedule(scheduled.id, {
        scheduled_for: new Date(scheduledFor).toISOString(),
        duration_minutes: Number(duration),
        notes: notes || undefined,
      });
      toast.success('Session updated');
      onSaved();
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label>When</Label>
          <Input
            type="datetime-local"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Duration (min)</Label>
          <Input
            type="number"
            min={15}
            max={480}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <AssistedTextarea
          rows={2}
          value={notes}
          onChange={setNotes}
          assistKind="schedule_notes"
          assistStudentId={studentId}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
