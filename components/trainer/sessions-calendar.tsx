'use client';

import { useMemo, useState } from 'react';
import {
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleSlash,
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
import { cn } from '@/lib/utils';
import {
  billingApi,
  type PackageRow,
  type ScheduledSessionRow,
  type ScheduleStatus,
  type ServiceRow,
} from '@/lib/api/billing';
import { describeApiError } from '@/lib/api';
import type { Student } from '@/lib/types';

// ============================================================================
// Date helpers (no library — native Date is enough for a month grid)
// ============================================================================

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
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
  // YYYY-MM-DD in local time — matches the cell key we group by.
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** 42-cell month grid (always 6 weeks). Includes leading days from the
 *  previous month and trailing days from the next so each row has 7 cells. */
function buildMonthGrid(monthAnchor: Date): Date[] {
  const start = startOfMonth(monthAnchor);
  const offset = start.getDay(); // 0=Sun
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
// Status colors
// ============================================================================

const CHIP_TONES: Record<ScheduleStatus, string> = {
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

// ============================================================================
// SessionsCalendar
// ============================================================================

interface Props {
  sessions: ScheduledSessionRow[];
  studentMap: Map<string, Student>;
  serviceMap: Map<string, ServiceRow>;
  packageMap: Map<string, PackageRow>;
  onChanged: () => void;
  /** Called when a day cell is clicked — host should open its schedule
   *  form pre-filled with the picked datetime (default 12:00 PM local). */
  onPickDay?: (datetime: string) => void;
}

export function SessionsCalendar({
  sessions,
  studentMap,
  serviceMap,
  packageMap,
  onChanged,
  onPickDay,
}: Props) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState<Date>(() => startOfMonth(today));
  const [selected, setSelected] = useState<ScheduledSessionRow | null>(null);

  const grid = useMemo(() => buildMonthGrid(cursor), [cursor]);

  // Group by local YYYY-MM-DD.
  const byDate = useMemo(() => {
    const m = new Map<string, ScheduledSessionRow[]>();
    for (const s of sessions) {
      const key = localDateKey(new Date(s.scheduled_for));
      const arr = m.get(key) ?? [];
      arr.push(s);
      m.set(key, arr);
    }
    // Sort each day's events by time.
    for (const arr of m.values()) {
      arr.sort(
        (a, b) =>
          new Date(a.scheduled_for).getTime() -
          new Date(b.scheduled_for).getTime(),
      );
    }
    return m;
  }, [sessions]);

  function handleDayClick(d: Date) {
    if (!onPickDay) return;
    // Default to 12:00 PM local on the picked day.
    const dt = new Date(d);
    dt.setHours(12, 0, 0, 0);
    // Format as the value a <input type="datetime-local"> wants.
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    const hh = String(dt.getHours()).padStart(2, '0');
    const mi = String(dt.getMinutes()).padStart(2, '0');
    onPickDay(`${yyyy}-${mm}-${dd}T${hh}:${mi}`);
  }

  return (
    <div className="space-y-3">
      {/* ── Header ── */}
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
        <LegendDots />
      </div>

      {/* ── Weekday header ── */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      {/* ── Month grid ── */}
      <div className="grid grid-cols-7 gap-1">
        {grid.map((d) => {
          const key = localDateKey(d);
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = isSameDay(d, today);
          const events = byDate.get(key) ?? [];
          const visible = events.slice(0, 3);
          const overflow = events.length - visible.length;

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
                {events.length > 0 ? (
                  <span className="text-[10px] text-muted-foreground">
                    {events.length}
                  </span>
                ) : null}
              </div>
              <div className="space-y-1">
                {visible.map((ev) => {
                  const stu = studentMap.get(ev.student_id);
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(ev);
                      }}
                      className={cn(
                        'w-full truncate rounded-sm border px-1.5 py-0.5 text-left text-[11px]',
                        CHIP_TONES[ev.status] ?? CHIP_TONES.scheduled,
                      )}
                      title={`${fmtTime(ev.scheduled_for)} · ${
                        stu?.full_name ?? 'student'
                      } · ${ev.status}`}
                    >
                      <span className="font-mono">
                        {fmtTime(ev.scheduled_for)}
                      </span>{' '}
                      {stu?.full_name ?? '(unknown)'}
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

      {/* ── Event detail dialog ── */}
      <SessionDetailDialog
        session={selected}
        student={selected ? studentMap.get(selected.student_id) : undefined}
        service={selected ? serviceMap.get(selected.service_id) : undefined}
        pkg={
          selected?.package_id
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
// Dialog body
// ============================================================================

function SessionDetailDialog({
  session,
  student,
  service,
  pkg,
  onClose,
  onChanged,
}: {
  session: ScheduledSessionRow | null;
  student?: Student;
  service?: ServiceRow;
  pkg?: PackageRow;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  if (!session) return null;

  async function setStatus(status: ScheduleStatus, label: string) {
    if (!session) return;
    setBusy(true);
    try {
      await billingApi.updateSchedule(session.id, { status });
      toast.success(label);
      onChanged();
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function remind() {
    if (!session) return;
    setBusy(true);
    try {
      const res = await billingApi.remindStudent(session.id);
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

  const isOpen = session.status === 'scheduled' || session.status === 'confirmed';

  return (
    <Dialog open={!!session} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {student?.full_name ?? '(unknown student)'}
          </DialogTitle>
          <DialogDescription>
            {fmtWhenFull(session.scheduled_for)} · {session.duration_minutes}m
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="capitalize">
              {session.status.replace('_', ' ')}
            </Badge>
            {service ? (
              <Badge variant="outline">{service.name}</Badge>
            ) : null}
            <Badge variant="outline">
              {pkg
                ? `Package ${pkg.sessions_remaining}/${pkg.total_sessions}`
                : 'Drop-in'}
            </Badge>
            <Badge variant="outline">{fmtCents(session.price_cents)}</Badge>
          </div>
          {session.notes ? (
            <p className="rounded-md border border-border bg-background/40 p-3 text-xs italic text-muted-foreground">
              {session.notes}
            </p>
          ) : null}
        </div>

        <DialogFooter className="flex-wrap gap-2">
          {isOpen ? (
            <>
              <Button
                disabled={busy}
                onClick={() => setStatus('completed', 'Marked completed')}
              >
                <Check className="h-4 w-4" />
                Completed
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setStatus('no_show', 'Marked no-show')}
              >
                <CircleSlash className="h-4 w-4" />
                No-show
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={remind}
              >
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
          ) : (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Legend
// ============================================================================

function LegendDots() {
  const items: Array<{ label: string; cls: string }> = [
    { label: 'Scheduled', cls: 'bg-sky-500' },
    { label: 'Completed', cls: 'bg-emerald-500' },
    { label: 'No-show', cls: 'bg-amber-500' },
    { label: 'Cancelled', cls: 'bg-rose-500' },
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
