'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CalendarDays,
  Check,
  ClipboardCopy,
  CreditCard,
  Inbox,
  Settings2,
  ThumbsDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingState } from '@/components/common/loading-state';
import { SessionsCalendar } from '@/components/trainer/sessions-calendar';
import { AvailabilityEditor } from '@/components/trainer/availability-editor';
import {
  billingApi,
  type PackageRow,
  type ServiceRow,
} from '@/lib/api/billing';
import {
  availabilityApi,
  bookingApi,
  calendarApi,
  type ApproveBody,
  type AvailableSlot,
  type CalendarEvent,
  type MarkPaidMethod,
  type ScheduledEvent,
} from '@/lib/api/calendar';
import { studentsApi } from '@/lib/api/students';
import { ApiClientError, describeApiError } from '@/lib/api';
import type { Student } from '@/lib/types';

const MARK_PAID_METHODS: MarkPaidMethod[] = ['cash', 'venmo', 'zelle', 'other'];

function fmtWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function fmtCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export default function TrainerSchedulePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const now = new Date();
      const from = new Date(now);
      from.setDate(from.getDate() - 60);
      const to = new Date(now);
      to.setDate(to.getDate() + 60);
      // Slots are clamped to now..+62d server-side; ask for six weeks.
      const slotsTo = new Date(now);
      slotsTo.setDate(slotsTo.getDate() + 42);

      const [stu, svcs, pkgs, evs, slotRes] = await Promise.all([
        studentsApi.list(),
        billingApi.listServices(true),
        billingApi.listAllPackages(),
        calendarApi.events({
          from_date: from.toISOString(),
          to_date: to.toISOString(),
        }),
        availabilityApi.slots({
          from_date: now.toISOString(),
          to_date: slotsTo.toISOString(),
        }),
      ]);
      setStudents(stu);
      setServices(svcs);
      setPackages(pkgs);
      setEvents(evs);
      setSlots(slotRes.slots);
      setError(null);
    } catch (err) {
      setError(describeApiError(err));
    }
  }, []);

  useEffect(() => {
    // Wrapped so the loader's setState calls land in a promise callback
    // rather than synchronously in the effect body.
    void (async () => {
      await refresh();
    })();
  }, [refresh]);

  const studentMap = useMemo(
    () => new Map(students.map((s) => [s.id, s])),
    [students],
  );
  const serviceMap = useMemo(
    () => new Map(services.map((s) => [s.id, s])),
    [services],
  );
  const packageMap = useMemo(
    () => new Map(packages.map((p) => [p.id, p])),
    [packages],
  );

  const scheduledEvents = useMemo(
    () =>
      (events ?? []).filter(
        (e): e is ScheduledEvent => e.kind === 'scheduled',
      ),
    [events],
  );
  const pending = useMemo(
    () =>
      scheduledEvents
        .filter((e) => e.status === 'pending_approval')
        .sort(
          (a, b) =>
            new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
        ),
    [scheduledEvents],
  );
  const awaitingPayment = useMemo(
    () =>
      scheduledEvents
        .filter((e) => e.status === 'awaiting_payment')
        .sort(
          (a, b) =>
            new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
        ),
    [scheduledEvents],
  );

  if (error) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        {error}
      </p>
    );
  }
  if (!events) return <LoadingState label="Loading your schedule…" />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Schedule</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Approve client requests, settle payment, and set the hours you&apos;re
          on the mats.
        </p>
      </div>

      {/* ───────────────── Needs your approval ───────────────── */}
      <section className="space-y-3">
        <SectionHeader
          icon={<Inbox className="h-5 w-5" />}
          title="Needs your approval"
          subtitle="Nothing is locked in until you approve it and the money is settled."
        />

        {pending.length === 0 ? (
          <EmptyState
            title="No open requests"
            description="When a client grabs an open spot it lands here."
          />
        ) : (
          <div className="space-y-2">
            {pending.map((ev) => (
              <RequestCard
                key={ev.id}
                ev={ev}
                student={studentMap.get(ev.student_id)}
                service={ev.service_id ? serviceMap.get(ev.service_id) : undefined}
                pkg={ev.package_id ? packageMap.get(ev.package_id) : undefined}
                onChanged={refresh}
              />
            ))}
          </div>
        )}

        {awaitingPayment.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Awaiting payment
            </h3>
            {awaitingPayment.map((ev) => (
              <AwaitingPaymentCard
                key={ev.id}
                ev={ev}
                student={studentMap.get(ev.student_id)}
                onChanged={refresh}
              />
            ))}
          </div>
        ) : null}
      </section>

      {/* ───────────────── Calendar ───────────────── */}
      <section className="space-y-3">
        <SectionHeader
          icon={<CalendarDays className="h-5 w-5" />}
          title="Calendar"
          subtitle="Everything on the board — booked, pending, and still open."
        />
        <Card>
          <CardContent className="py-4">
            <SessionsCalendar
              events={events}
              studentMap={studentMap}
              serviceMap={serviceMap}
              packageMap={packageMap}
              availableSlots={slots}
              onChanged={refresh}
            />
          </CardContent>
        </Card>
      </section>

      {/* ───────────────── Availability ───────────────── */}
      <section className="space-y-3">
        <SectionHeader
          icon={<Settings2 className="h-5 w-5" />}
          title="Availability"
          subtitle="The windows clients can book into, and the time you're off."
        />
        <AvailabilityEditor onChanged={refresh} />
      </section>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

// ============================================================================
// Pending request — approve (with settlement choice) / decline
// ============================================================================

type RequestPanel = 'none' | 'approve' | 'markPaid' | 'decline';

function RequestCard({
  ev,
  student,
  service,
  pkg,
  onChanged,
}: {
  ev: ScheduledEvent;
  student?: Student;
  service?: ServiceRow;
  pkg?: PackageRow;
  onChanged: () => void;
}) {
  const [panel, setPanel] = useState<RequestPanel>('none');
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState<MarkPaidMethod>('cash');
  const [payNotes, setPayNotes] = useState('');
  const [reason, setReason] = useState('');
  const [packageExhausted, setPackageExhausted] = useState(false);

  async function approve(body: ApproveBody) {
    setBusy(true);
    try {
      const res = await bookingApi.approve(ev.id, body);
      if (res.checkout_url) {
        toast.success('Approved — awaiting payment', {
          description: 'The client got a pay link. It locks in once paid.',
        });
      } else {
        toast.success('Approved — locked in');
      }
      setPanel('none');
      onChanged();
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'PACKAGE_EXHAUSTED') {
        setPackageExhausted(true);
        setPanel('approve');
        toast.error('That package is out of credits.', {
          description: 'Approve as a drop-in, or sell a new package first.',
        });
      } else {
        toast.error(describeApiError(err));
      }
    } finally {
      setBusy(false);
    }
  }

  async function decline() {
    setBusy(true);
    try {
      await bookingApi.decline(
        ev.id,
        reason.trim() ? { reason: reason.trim() } : {},
      );
      toast.success('Request declined');
      setPanel('none');
      onChanged();
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold">
              {student?.full_name ?? '(unknown client)'}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              {fmtWhen(ev.starts_at)}
              {ev.duration_minutes ? ` · ${ev.duration_minutes}m` : ''}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {service ? <Badge variant="outline">{service.name}</Badge> : null}
            <Badge variant="outline">
              {pkg
                ? `Package ${pkg.sessions_remaining}/${pkg.total_sessions}`
                : 'Drop-in'}
            </Badge>
            {ev.price_cents != null ? (
              <Badge variant="outline">{fmtCents(ev.price_cents)}</Badge>
            ) : null}
          </div>
        </div>

        {ev.notes ? (
          <p className="rounded-md border border-border bg-background/40 p-2 text-xs italic text-muted-foreground">
            {ev.notes}
          </p>
        ) : null}

        {panel === 'none' ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={() => setPanel('approve')}>
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
          <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              How is this one settled?
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={busy} onClick={() => void approve({})}>
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
                onClick={() => setPanel('markPaid')}
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

        {panel === 'markPaid' ? (
          <div className="grid gap-3 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Method</Label>
              <Select
                value={method}
                onValueChange={(v) => setMethod(v as MarkPaidMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MARK_PAID_METHODS.map((m) => (
                    <SelectItem key={m} value={m} className="capitalize">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`notes-${ev.id}`}>Notes (optional)</Label>
              <Input
                id={`notes-${ev.id}`}
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="Reference"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                size="sm"
                disabled={busy}
                onClick={() =>
                  void approve({
                    mark_paid: {
                      method,
                      ...(payNotes.trim() ? { notes: payNotes.trim() } : {}),
                    },
                  })
                }
              >
                Approve + mark paid
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => setPanel('approve')}
              >
                Back
              </Button>
            </div>
          </div>
        ) : null}

        {panel === 'decline' ? (
          <div className="space-y-2 rounded-md border border-border p-3">
            <Label htmlFor={`reason-${ev.id}`}>Reason (optional)</Label>
            <Textarea
              id={`reason-${ev.id}`}
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
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
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Approved but unpaid — waive / mark paid / copy the pay link
// ============================================================================

function AwaitingPaymentCard({
  ev,
  student,
  onChanged,
}: {
  ev: ScheduledEvent;
  student?: Student;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [settling, setSettling] = useState(false);
  const [method, setMethod] = useState<MarkPaidMethod>('cash');

  async function run(fn: () => Promise<unknown>, okMessage: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(okMessage);
      setSettling(false);
      onChanged();
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function copyPayLink() {
    setBusy(true);
    try {
      const res = await bookingApi.checkout(ev.id);
      await navigator.clipboard.writeText(res.checkout_url);
      toast.success('Pay link copied');
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold">
              {student?.full_name ?? '(unknown client)'}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {fmtWhen(ev.starts_at)}
              {ev.price_cents != null ? ` · ${fmtCents(ev.price_cents)}` : ''}
            </div>
          </div>
          <Badge variant="outline">Awaiting payment</Badge>
        </div>

        {settling ? (
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-40 space-y-2">
              <Label>Method</Label>
              <Select
                value={method}
                onValueChange={(v) => setMethod(v as MarkPaidMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MARK_PAID_METHODS.map((m) => (
                    <SelectItem key={m} value={m} className="capitalize">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                void run(
                  () => bookingApi.markPaid(ev.id, { method }),
                  'Payment recorded — locked in',
                )
              }
            >
              Mark paid
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => setSettling(false)}
            >
              Back
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() =>
                void run(
                  () => bookingApi.waivePayment(ev.id),
                  'Payment waived — locked in',
                )
              }
            >
              Waive payment
            </Button>
            <Button size="sm" disabled={busy} onClick={() => setSettling(true)}>
              <CreditCard className="h-4 w-4" />
              Mark paid
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => void copyPayLink()}
            >
              <ClipboardCopy className="h-4 w-4" />
              Copy pay link
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
