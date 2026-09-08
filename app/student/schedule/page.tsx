'use client';

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { LoadingState } from '@/components/common/loading-state';
import { EmptyState } from '@/components/common/empty-state';
import { PushToggle } from '@/components/common/push-toggle';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SessionsCalendar } from '@/components/trainer/sessions-calendar';
import {
  availabilityApi,
  bookingApi,
  calendarApi,
  type AvailableSlot,
  type BookableService,
  type CalendarEvent,
  type ScheduledEvent,
} from '@/lib/api/calendar';
import { billingApi, type PackageRow } from '@/lib/api/billing';
import { studentPortalApi } from '@/lib/api/student-portal';
import { ApiClientError, describeApiError } from '@/lib/api';
import { STATUS_LABEL, eventTone } from '@/lib/schedule-tones';
import type { Student } from '@/lib/types';

const DROP_IN = '__drop_in__';

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

function bucketEvents(events: CalendarEvent[]) {
  const now = Date.now();
  const upcoming: CalendarEvent[] = [];
  const past: CalendarEvent[] = [];
  for (const e of events) {
    const t = new Date(e.starts_at).getTime();
    if (t >= now - 60_000) upcoming.push(e);
    else past.push(e);
  }
  upcoming.sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
  past.sort(
    (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime(),
  );
  return { upcoming, past };
}

export default function StudentSchedulePage() {
  // useSearchParams requires a Suspense boundary during prerender.
  return (
    <Suspense fallback={<LoadingState label="Loading your schedule…" />}>
      <StudentScheduleContent />
    </Suspense>
  );
}

function StudentScheduleContent() {
  const searchParams = useSearchParams();
  const justPaid = searchParams.get('paid') === '1';
  const paidToastShown = useRef(false);

  const [me, setMe] = useState<Student | null>(null);
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [services, setServices] = useState<BookableService[]>([]);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pickedSlot, setPickedSlot] = useState<AvailableSlot | null>(null);

  const refresh = useCallback(async () => {
    try {
      const now = new Date();
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      const to = new Date(now);
      to.setDate(to.getDate() + 60);
      const slotsTo = new Date(now);
      slotsTo.setDate(slotsTo.getDate() + 42);

      const student = await studentPortalApi.me();
      const [evs, slotRes, pkgs] = await Promise.all([
        calendarApi.events({
          from_date: from.toISOString(),
          to_date: to.toISOString(),
        }),
        availabilityApi.slots({
          from_date: now.toISOString(),
          to_date: slotsTo.toISOString(),
        }),
        billingApi.listPackages(student.id),
      ]);
      setMe(student);
      setEvents(evs);
      setSlots(slotRes.slots);
      setServices(slotRes.services);
      setPackages(pkgs);
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

  // Back from Stripe checkout.
  useEffect(() => {
    if (!justPaid || paidToastShown.current) return;
    paidToastShown.current = true;
    void (async () => {
      toast.success("Payment received — you're locked in");
      await refresh();
    })();
  }, [justPaid, refresh]);

  const { upcoming, past } = useMemo(
    () => bucketEvents(events ?? []),
    [events],
  );

  const studentMap = useMemo(
    () => (me ? new Map([[me.id, me]]) : new Map<string, Student>()),
    [me],
  );
  const serviceMap = useMemo(
    () => new Map(services.map((s) => [s.id, s])),
    [services],
  );
  const packageMap = useMemo(
    () => new Map(packages.map((p) => [p.id, p])),
    [packages],
  );

  const bookablePackages = useMemo(
    () =>
      packages.filter(
        (p) => p.status === 'active' && p.sessions_remaining > 0,
      ),
    [packages],
  );

  async function pay(ev: ScheduledEvent) {
    try {
      const res = await bookingApi.checkout(ev.id);
      window.location.assign(res.checkout_url);
    } catch (err) {
      toast.error(describeApiError(err));
    }
  }

  async function cancelRequest(ev: ScheduledEvent) {
    if (!window.confirm('Cancel this request?')) return;
    try {
      await bookingApi.cancelRequest(ev.id);
      toast.success('Request cancelled');
      void refresh();
    } catch (err) {
      toast.error(describeApiError(err));
    }
  }

  if (error) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        {error}
      </p>
    );
  }
  if (!events || !me) return <LoadingState label="Loading your schedule…" />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Schedule</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick an open spot to request a session. Your coach approves, and
            it&apos;s locked in once payment is settled.
          </p>
        </div>
        <PushToggle />
      </div>

      <Card>
        <CardContent className="py-4">
          <SessionsCalendar
            mode="student"
            events={events}
            studentMap={studentMap}
            serviceMap={serviceMap}
            packageMap={packageMap}
            availableSlots={slots}
            onChanged={refresh}
            onPickSlot={setPickedSlot}
            onPay={pay}
            onCancelRequest={cancelRequest}
          />
        </CardContent>
      </Card>

      <RequestSessionDialog
        key={pickedSlot?.starts_at ?? 'no-slot'}
        slot={pickedSlot}
        services={services}
        packages={bookablePackages}
        serviceMap={serviceMap}
        onClose={() => setPickedSlot(null)}
        onBooked={() => {
          setPickedSlot(null);
          void refresh();
        }}
        onSlotTaken={() => {
          setPickedSlot(null);
          void refresh();
        }}
      />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState
            title="Nothing on the calendar"
            description="Grab an open spot above to send your coach a request."
          />
        ) : (
          <div className="space-y-2">
            {upcoming.map((e) => (
              <EventRow key={`${e.kind}-${e.id}`} ev={e} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Past 30 days
        </h2>
        {past.length === 0 ? (
          <p className="text-xs text-muted-foreground">No recent sessions.</p>
        ) : (
          <div className="space-y-2">
            {past.slice(0, 20).map((e) => (
              <EventRow key={`${e.kind}-${e.id}`} ev={e} muted />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ============================================================================
// Request dialog — service + package choice for one open slot
// ============================================================================

function RequestSessionDialog({
  slot,
  services,
  packages,
  serviceMap,
  onClose,
  onBooked,
  onSlotTaken,
}: {
  slot: AvailableSlot | null;
  services: BookableService[];
  packages: PackageRow[];
  serviceMap: Map<string, BookableService>;
  onClose: () => void;
  onBooked: () => void;
  onSlotTaken: () => void;
}) {
  // Defaults come from the initial render; the parent remounts this dialog
  // (keyed on the slot) so a new pick starts from a clean form.
  const [serviceId, setServiceId] = useState(services[0]?.id ?? '');
  const [packageId, setPackageId] = useState(DROP_IN);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  if (!slot) return null;

  const service = services.find((s) => s.id === serviceId);

  async function submit() {
    if (!slot || !serviceId) return;
    setBusy(true);
    try {
      await bookingApi.request({
        starts_at: slot.starts_at,
        service_id: serviceId,
        ...(packageId !== DROP_IN ? { package_id: packageId } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      toast.success('Request sent — waiting on your coach');
      onBooked();
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'SLOT_TAKEN') {
        toast.error('That spot was just taken');
        onSlotTaken();
      } else {
        toast.error(describeApiError(err));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request this spot</DialogTitle>
          <DialogDescription>
            {fmtWhen(slot.starts_at)} · {slot.duration_minutes} min
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Session type</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a session type" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} · {fmtCents(s.default_price_cents)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>How you&apos;re covering it</Label>
            <Select value={packageId} onValueChange={setPackageId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {packages.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    Use package credit:{' '}
                    {serviceMap.get(p.service_id)?.name ?? 'Package'} (
                    {p.sessions_remaining} left)
                  </SelectItem>
                ))}
                <SelectItem value={DROP_IN}>
                  Pay per session
                  {service ? ` (${fmtCents(service.default_price_cents)})` : ''}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="request-notes">
              Anything your coach should know? (optional)
            </Label>
            <Textarea
              id="request-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Working the guard passing series"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" disabled={busy} onClick={onClose}>
            Never mind
          </Button>
          <Button disabled={busy || !serviceId} onClick={() => void submit()}>
            {busy ? 'Sending…' : 'Send request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// List rows
// ============================================================================

function EventRow({ ev, muted }: { ev: CalendarEvent; muted?: boolean }) {
  const isLogged = !!ev.fulfilled_session_id;
  const tone = eventTone(ev);
  const variant =
    tone === 'cancelled' || tone === 'no_show' || tone === 'declined'
      ? 'destructive'
      : isLogged || tone === 'completed'
        ? 'default'
        : 'secondary';

  return (
    <Card className={muted ? 'opacity-80' : ''}>
      <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold">{fmtWhen(ev.starts_at)}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {ev.duration_minutes ? `${ev.duration_minutes} min` : 'Plan item'}
            {ev.kind === 'planned' && ev.session_type
              ? ` · ${ev.session_type}`
              : ''}
            {ev.kind === 'planned' && ev.plan_focus ? ` · ${ev.plan_focus}` : ''}
          </div>
        </div>
        <Badge variant={variant}>
          {isLogged ? 'Done' : STATUS_LABEL[tone]}
        </Badge>
      </CardContent>
    </Card>
  );
}
