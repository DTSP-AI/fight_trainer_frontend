'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleSlash,
  Dumbbell,
  Pencil,
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
import { AssistedTextarea } from '@/components/common/assisted-textarea';
import { cn } from '@/lib/utils';
import {
  billingApi,
  type PackageRow,
  type ScheduleStatus,
  type ServiceRow,
} from '@/lib/api/billing';
import type {
  CalendarEvent,
  PlannedEvent,
  ScheduledEvent,
} from '@/lib/api/calendar';
import { plansApi } from '@/lib/api/plans';
import { sessionsApi } from '@/lib/api/sessions';
import { describeApiError } from '@/lib/api';
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

const SCHEDULED_TONES: Record<ScheduleStatus, string> = {
  scheduled:
    'border-sky-500/50 bg-sky-500/15 text-sky-100 hover:bg-sky-500/25',
  confirmed:
    'border-blue-500/50 bg-blue-500/15 text-blue-100 hover:bg-blue-500/25',
  completed:
    'border-emerald-500/50 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25',
  no_show:
    'border-amber-500/50 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25',
  cancelled:
    'border-rose-500/50 bg-rose-500/15 text-rose-200 line-through hover:bg-rose-500/25',
};

const PLAN_TONE_OPEN =
  'border border-dashed border-violet-400/60 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20';
const PLAN_TONE_DONE =
  'border border-dashed border-emerald-400/60 bg-emerald-500/10 text-emerald-100';

function eventClass(ev: CalendarEvent): string {
  if (ev.kind === 'planned') {
    return ev.fulfilled_session_id ? PLAN_TONE_DONE : PLAN_TONE_OPEN;
  }
  return SCHEDULED_TONES[ev.status ?? 'scheduled'];
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
  serviceMap: Map<string, ServiceRow>;
  packageMap: Map<string, PackageRow>;
  onChanged: () => void;
  /** Called when a day cell is clicked — host should open its schedule
   *  form pre-filled with the picked datetime (default 12:00 PM local). */
  onPickDay?: (datetime: string) => void;
}

export function SessionsCalendar({
  events,
  studentMap,
  serviceMap,
  packageMap,
  onChanged,
  onPickDay,
}: Props) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState<Date>(() => startOfMonth(today));
  const [selected, setSelected] = useState<CalendarEvent | null>(null);

  const grid = useMemo(() => buildMonthGrid(cursor), [cursor]);

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
        <Legend />
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
        onClose={() => setSelected(null)}
        onChanged={() => {
          setSelected(null);
          onChanged();
        }}
      />
    </div>
  );
}

// ============================================================================
// Event detail dialog — different actions for scheduled vs planned
// ============================================================================

function EventDetailDialog({
  event,
  student,
  service,
  pkg,
  onClose,
  onChanged,
}: {
  event: CalendarEvent | null;
  student?: Student;
  service?: ServiceRow;
  pkg?: PackageRow;
  onClose: () => void;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  if (!event) return null;

  const scheduled = event.kind === 'scheduled' ? (event as ScheduledEvent) : null;
  const planned = event.kind === 'planned' ? (event as PlannedEvent) : null;

  async function setStatus(status: ScheduleStatus, label: string) {
    if (!scheduled) return;
    setBusy(true);
    try {
      await billingApi.updateSchedule(scheduled.id, { status });
      toast.success(label);
      onChanged();
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function remind() {
    if (!scheduled) return;
    setBusy(true);
    try {
      const res = await billingApi.remindStudent(scheduled.id);
      if (res.status === 'sent') {
        toast.success(`Reminder sent to ${student?.full_name ?? 'student'}`);
      } else if (res.status === 'skipped') {
        toast(`Email service not configured`, {
          description:
            'Set RESEND_API_KEY on the backend to deliver reminders.',
        });
      } else {
        toast.error(res.error ?? 'Reminder failed');
      }
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function markDone() {
    if (!event) return;
    setBusy(true);
    try {
      // Canonical fulfillment path — POST /api/sessions with quick_log=true
      // and the appropriate linkage. Backend marks the source row fulfilled.
      await sessionsApi.create({
        student_id: event.student_id,
        session_date: event.starts_at.slice(0, 10),
        duration_minutes: event.duration_minutes ?? null,
        mode: 'text',
        quick_log: true,
        scheduled_session_id:
          event.kind === 'scheduled' ? event.id : null,
        planned_session_id: event.kind === 'planned' ? event.id : null,
      });
      toast.success('Marked done');
      onChanged();
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function deleteEvent() {
    if (!event) return;
    const kindLabel = event.kind === 'planned' ? 'plan item' : 'session';
    if (!window.confirm(`Delete this ${kindLabel}? This cannot be undone.`)) {
      return;
    }
    setBusy(true);
    try {
      if (event.kind === 'scheduled') {
        await billingApi.deleteSchedule(event.id);
      } else {
        await plansApi.deletePlannedSession(event.id);
      }
      toast.success('Deleted');
      onChanged();
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setBusy(false);
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

  return (
    <Dialog
      open={!!event}
      onOpenChange={(o) => {
        if (!o) {
          setEditing(false);
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
                <Badge variant="secondary" className="capitalize">
                  {(scheduled.status ?? 'scheduled').replace('_', ' ')}
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
          {event.notes ? (
            <p className="rounded-md border border-border bg-background/40 p-3 text-xs italic text-muted-foreground">
              {event.notes}
            </p>
          ) : null}
        </div>
        ) : null}

        {!editing ? (
        <DialogFooter className="flex-col gap-2 sm:flex-col sm:items-stretch">
          {/* Primary action row — Mark Done is the everyday path. */}
          {!event.fulfilled_session_id && !planAlreadyDone ? (
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
                    onClick={() => setStatus('no_show', 'Marked no-show')}
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
                    onClick={() => setStatus('cancelled', 'Cancelled')}
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
          {!event.fulfilled_session_id && !planAlreadyDone ? (
            <button
              type="button"
              onClick={logSession}
              disabled={busy}
              className="text-xs text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
            >
              or log full session details (runs the analysis pipeline) →
            </button>
          ) : null}

          {/* Edit + delete row — always available. Edit only on scheduled. */}
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

// ============================================================================
// Legend
// ============================================================================

function Legend() {
  const items: Array<{ label: string; cls: string }> = [
    { label: 'Scheduled', cls: 'bg-sky-500' },
    { label: 'Logged', cls: 'bg-emerald-500' },
    { label: 'No-show', cls: 'bg-amber-500' },
    { label: 'Cancelled', cls: 'bg-rose-500' },
    { label: 'Plan', cls: 'bg-violet-500' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-1">
          <span className={cn('h-2 w-2 rounded-full', i.cls)} />
          {i.label}
        </div>
      ))}
    </div>
  );
}
