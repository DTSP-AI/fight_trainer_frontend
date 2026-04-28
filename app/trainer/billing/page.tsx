'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CalendarDays,
  CalendarPlus,
  Check,
  CircleSlash,
  Layers,
  List,
  Plus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/empty-state';
import { SessionsCalendar } from '@/components/trainer/sessions-calendar';
import {
  billingApi,
  type PackageRow,
  type ScheduledSessionRow,
  type ScheduleStatus,
  type ServiceRow,
  type Sport,
} from '@/lib/api/billing';
import { studentsApi } from '@/lib/api/students';
import { describeApiError } from '@/lib/api';
import type { Student } from '@/lib/types';

// ============================================================================
// formatters
// ============================================================================

function fmtCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

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

const SPORTS: Sport[] = [
  'bjj',
  'mma',
  'muay_thai',
  'boxing',
  'wrestling',
  'kickboxing',
];

const SCHEDULE_STATUS_VARIANTS: Record<
  ScheduleStatus,
  'default' | 'secondary' | 'destructive'
> = {
  scheduled: 'secondary',
  confirmed: 'secondary',
  completed: 'default',
  no_show: 'destructive',
  cancelled: 'destructive',
};

// ============================================================================
// page
// ============================================================================

export default function TrainerBillingHubPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [sessions, setSessions] = useState<ScheduledSessionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [scheduleFilter, setScheduleFilter] =
    useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [scheduleView, setScheduleView] = useState<'calendar' | 'list'>(
    'calendar',
  );
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
  const [prefillDateTime, setPrefillDateTime] = useState<string | undefined>(
    undefined,
  );

  const refresh = useCallback(async () => {
    try {
      const [stu, svcs, pkgs, sched] = await Promise.all([
        studentsApi.list(),
        billingApi.listServices(true),
        billingApi.listAllPackages(),
        billingApi.listScheduled(),
      ]);
      setStudents(stu);
      setServices(svcs);
      setPackages(pkgs);
      setSessions(sched);
    } catch (err) {
      setError(describeApiError(err));
    }
  }, []);

  useEffect(() => {
    void refresh();
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

  const filteredSessions = useMemo(() => {
    const now = Date.now();
    return sessions.filter((s) => {
      const t = new Date(s.scheduled_for).getTime();
      if (scheduleFilter === 'upcoming') return t >= now - 60_000;
      if (scheduleFilter === 'past') return t < now - 60_000;
      return true;
    });
  }, [sessions, scheduleFilter]);

  if (error) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        {error}
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Build services, sell packages, schedule sessions. Mark them done as
          you go.
        </p>
      </div>

      {/* ───────────────── Services Catalog ───────────────── */}
      <section className="space-y-3">
        <SectionHeader
          icon={<Layers className="h-5 w-5" />}
          title="Service catalog"
          subtitle="The reusable session types your packages and bookings draw from."
        />
        <ServicesPanel services={services} onChanged={refresh} />
      </section>

      {/* ───────────────── Packages ───────────────── */}
      <section className="space-y-3">
        <SectionHeader
          icon={<Plus className="h-5 w-5" />}
          title="Packages"
          subtitle="Bundles of pre-paid sessions tied to a single student."
        />
        <PackagesPanel
          students={students}
          services={services}
          packages={packages}
          studentMap={studentMap}
          serviceMap={serviceMap}
          onChanged={refresh}
        />
      </section>

      {/* ───────────────── Sessions ───────────────── */}
      <section className="space-y-3">
        <SectionHeader
          icon={<CalendarPlus className="h-5 w-5" />}
          title="Sessions"
          subtitle="Schedule, confirm, and mark sessions complete or no-show."
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <ScheduleNewForm
            students={students}
            services={services}
            packages={packages}
            onCreated={refresh}
            open={scheduleFormOpen}
            onOpenChange={(next) => {
              setScheduleFormOpen(next);
              if (!next) setPrefillDateTime(undefined);
            }}
            defaultDateTime={prefillDateTime}
          />
          <div className="flex gap-1 rounded-md border border-border p-1">
            <Button
              size="sm"
              variant={scheduleView === 'calendar' ? 'default' : 'ghost'}
              onClick={() => setScheduleView('calendar')}
            >
              <CalendarDays className="h-4 w-4" />
              Calendar
            </Button>
            <Button
              size="sm"
              variant={scheduleView === 'list' ? 'default' : 'ghost'}
              onClick={() => setScheduleView('list')}
            >
              <List className="h-4 w-4" />
              List
            </Button>
          </div>
        </div>

        {scheduleView === 'calendar' ? (
          <Card>
            <CardContent className="py-4">
              <SessionsCalendar
                sessions={sessions}
                studentMap={studentMap}
                serviceMap={serviceMap}
                packageMap={packageMap}
                onChanged={refresh}
                onPickDay={(dt) => {
                  setPrefillDateTime(dt);
                  setScheduleFormOpen(true);
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex gap-2">
              {(['upcoming', 'past', 'all'] as const).map((f) => (
                <Button
                  key={f}
                  variant={scheduleFilter === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setScheduleFilter(f)}
                >
                  {f}
                </Button>
              ))}
            </div>
            {filteredSessions.length === 0 ? (
              <EmptyState
                title="No sessions"
                description={
                  scheduleFilter === 'upcoming'
                    ? 'Schedule one with the form above.'
                    : 'Nothing here yet.'
                }
              />
            ) : (
              <div className="space-y-2">
                {filteredSessions.map((s) => (
                  <SessionRow
                    key={s.id}
                    s={s}
                    student={studentMap.get(s.student_id)}
                    service={serviceMap.get(s.service_id)}
                    pkg={
                      s.package_id ? packageMap.get(s.package_id) : undefined
                    }
                    onChanged={refresh}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

// ============================================================================
// SectionHeader
// ============================================================================

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
// Services Panel
// ============================================================================

function ServicesPanel({
  services,
  onChanged,
}: {
  services: ServiceRow[];
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        {services.length === 0 ? (
          <EmptyState
            title="No services yet"
            description="Add your first session type below — e.g. '60-min BJJ private'."
          />
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {services.map((s) => (
              <ServiceRowItem key={s.id} s={s} onChanged={onChanged} />
            ))}
          </div>
        )}
        {open ? (
          <NewServiceForm
            onCreated={() => {
              setOpen(false);
              onChanged();
            }}
            onCancel={() => setOpen(false)}
          />
        ) : (
          <Button onClick={() => setOpen(true)} variant="outline" size="sm">
            <Plus className="h-4 w-4" />
            New service
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ServiceRowItem({
  s,
  onChanged,
}: {
  s: ServiceRow;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  async function toggleActive() {
    setBusy(true);
    try {
      await billingApi.updateService(s.id, { is_active: !s.is_active });
      toast.success(s.is_active ? 'Service archived' : 'Service activated');
      onChanged();
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-background/40 p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {s.name}
          {!s.is_active ? (
            <Badge variant="secondary" className="text-xs">
              archived
            </Badge>
          ) : null}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {s.sport.replace('_', ' ')} · {s.default_duration_minutes}m ·{' '}
          {fmtCents(s.default_price_cents)}
        </div>
      </div>
      <Button size="sm" variant="ghost" disabled={busy} onClick={toggleActive}>
        {s.is_active ? 'Archive' : 'Activate'}
      </Button>
    </div>
  );
}

function NewServiceForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [sport, setSport] = useState<Sport>('bjj');
  const [duration, setDuration] = useState('60');
  const [price, setPrice] = useState('80');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await billingApi.createService({
        name: name.trim(),
        sport,
        default_duration_minutes: Number(duration),
        default_price_cents: Math.round(Number(price) * 100),
        description: description.trim() || undefined,
      });
      toast.success('Service created');
      onCreated();
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-md border border-border bg-background/30 p-4"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="svc_name">Name</Label>
          <Input
            id="svc_name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="60-min BJJ private"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Sport</Label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={sport}
            onChange={(e) => setSport(e.target.value as Sport)}
            required
          >
            {SPORTS.map((sp) => (
              <option key={sp} value={sp}>
                {sp.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="svc_dur">Default duration (min)</Label>
          <Input
            id="svc_dur"
            type="number"
            min={15}
            max={480}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="svc_price">Default price ($)</Label>
          <Input
            id="svc_price"
            type="number"
            step="0.01"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="svc_desc">Description (optional)</Label>
        <Textarea
          id="svc_desc"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save service'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// Packages Panel
// ============================================================================

function PackagesPanel({
  students,
  services,
  packages,
  studentMap,
  serviceMap,
  onChanged,
}: {
  students: Student[];
  services: ServiceRow[];
  packages: PackageRow[];
  studentMap: Map<string, Student>;
  serviceMap: Map<string, ServiceRow>;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        {packages.length === 0 ? (
          <EmptyState
            title="No packages yet"
            description="Sell your first one below — pick a student, pick a service, set total sessions and per-session price."
          />
        ) : (
          <div className="space-y-2">
            {packages.map((p) => (
              <PackageRowItem
                key={p.id}
                p={p}
                student={studentMap.get(p.student_id)}
                service={serviceMap.get(p.service_id)}
                onChanged={onChanged}
              />
            ))}
          </div>
        )}
        {open ? (
          <NewPackageForm
            students={students}
            services={services}
            onCreated={() => {
              setOpen(false);
              onChanged();
            }}
            onCancel={() => setOpen(false)}
          />
        ) : (
          <Button onClick={() => setOpen(true)} variant="outline" size="sm">
            <Plus className="h-4 w-4" />
            New package
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function PackageRowItem({
  p,
  student,
  service,
  onChanged,
}: {
  p: PackageRow;
  student?: Student;
  service?: ServiceRow;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function markPaid() {
    setBusy(true);
    try {
      await billingApi.recordManualPayment(p.id, {
        amount_cents: p.total_price_cents - p.amount_paid_cents,
        method: 'cash',
      });
      toast.success('Marked paid');
      onChanged();
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setBusy(false);
    }
  }

  const remaining = p.sessions_remaining;
  const total = p.total_sessions;
  const paid = p.payment_status === 'paid';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background/40 p-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">
          {student?.full_name ?? '(unknown student)'} ·{' '}
          {service?.name ?? '(deleted service)'}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {remaining}/{total} left · {fmtCents(p.price_per_session_cents)}/session
          · {fmtCents(p.total_price_cents)} total
        </div>
        {p.notes ? (
          <div className="mt-1 text-xs italic text-muted-foreground">
            {p.notes}
          </div>
        ) : null}
      </div>
      <Badge variant={paid ? 'default' : 'secondary'}>
        {p.payment_status}
      </Badge>
      <Badge variant={p.status === 'active' ? 'default' : 'secondary'}>
        {p.status}
      </Badge>
      {!paid ? (
        <Button size="sm" variant="outline" disabled={busy} onClick={markPaid}>
          <Check className="h-4 w-4" />
          Mark paid
        </Button>
      ) : null}
    </div>
  );
}

function NewPackageForm({
  students,
  services,
  onCreated,
  onCancel,
}: {
  students: Student[];
  services: ServiceRow[];
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [studentId, setStudentId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [totalSessions, setTotalSessions] = useState('10');
  const [price, setPrice] = useState('80');
  const [markPaid, setMarkPaid] = useState(false);
  const [busy, setBusy] = useState(false);

  // Default price from service when picked.
  function pickService(id: string) {
    setServiceId(id);
    const svc = services.find((s) => s.id === id);
    if (svc) setPrice((svc.default_price_cents / 100).toFixed(2));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await billingApi.createPackage(studentId, {
        student_id: studentId,
        service_id: serviceId,
        total_sessions: Number(totalSessions),
        price_per_session_cents: Math.round(Number(price) * 100),
        mark_paid_method: markPaid ? 'cash' : undefined,
      });
      toast.success('Package created');
      onCreated();
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-md border border-border bg-background/30 p-4"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Student</Label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            required
          >
            <option value="">Pick a student…</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Service</Label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={serviceId}
            onChange={(e) => pickService(e.target.value)}
            required
          >
            <option value="">Pick a service…</option>
            {services
              .filter((s) => s.is_active)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pkg_total">Total sessions</Label>
          <Input
            id="pkg_total"
            type="number"
            min={1}
            max={100}
            value={totalSessions}
            onChange={(e) => setTotalSessions(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pkg_price">Price per session ($)</Label>
          <Input
            id="pkg_price"
            type="number"
            step="0.01"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={markPaid}
          onChange={(e) => setMarkPaid(e.target.checked)}
        />
        Mark paid in full now (cash)
      </label>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Create package'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// Schedule (sessions) Panel
// ============================================================================

function ScheduleNewForm({
  students,
  services,
  packages,
  onCreated,
  open,
  onOpenChange,
  defaultDateTime,
}: {
  students: Student[];
  services: ServiceRow[];
  packages: PackageRow[];
  onCreated: () => void;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  defaultDateTime?: string;
}) {
  const [studentId, setStudentId] = useState('');
  const [packageId, setPackageId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [scheduledFor, setScheduledFor] = useState(defaultDateTime ?? '');

  // Adopt a freshly-picked day from the calendar.
  useEffect(() => {
    if (defaultDateTime) setScheduledFor(defaultDateTime);
  }, [defaultDateTime]);
  const [duration, setDuration] = useState('60');
  const [price, setPrice] = useState('80');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  // Packages for the picked student that still have credit.
  const studentPackages = useMemo(
    () =>
      packages.filter(
        (p) =>
          p.student_id === studentId &&
          p.status === 'active' &&
          p.sessions_remaining > 0,
      ),
    [packages, studentId],
  );

  function pickPackage(id: string) {
    setPackageId(id);
    if (!id) return;
    const p = packages.find((x) => x.id === id);
    if (p) {
      setServiceId(p.service_id);
      setPrice((p.price_per_session_cents / 100).toFixed(2));
    }
  }

  function pickService(id: string) {
    setServiceId(id);
    const svc = services.find((s) => s.id === id);
    if (svc) {
      setDuration(String(svc.default_duration_minutes));
      if (!packageId) {
        setPrice((svc.default_price_cents / 100).toFixed(2));
      }
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await billingApi.scheduleSession({
        student_id: studentId,
        service_id: serviceId,
        package_id: packageId || undefined,
        scheduled_for: new Date(scheduledFor).toISOString(),
        duration_minutes: Number(duration),
        price_cents: Math.round(Number(price) * 100),
        notes: notes || undefined,
      });
      toast.success('Session scheduled');
      onOpenChange(false);
      setNotes('');
      setScheduledFor('');
      setStudentId('');
      setPackageId('');
      setServiceId('');
      onCreated();
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => onOpenChange(true)} variant="outline" size="sm">
        <CalendarPlus className="h-4 w-4" />
        Schedule a session
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Schedule a session</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Student</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={studentId}
                onChange={(e) => {
                  setStudentId(e.target.value);
                  setPackageId('');
                }}
                required
              >
                <option value="">Pick a student…</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Package (optional — drop-in if blank)</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={packageId}
                onChange={(e) => pickPackage(e.target.value)}
                disabled={!studentPackages.length}
              >
                <option value="">— none (drop-in) —</option>
                {studentPackages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sessions_remaining}/{p.total_sessions} ·{' '}
                    {fmtCents(p.price_per_session_cents)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Service</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={serviceId}
                onChange={(e) => pickService(e.target.value)}
                required
              >
                <option value="">Pick a service…</option>
                {services
                  .filter((s) => s.is_active)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="when">When</Label>
              <Input
                id="when"
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dur">Duration (min)</Label>
              <Input
                id="dur"
                type="number"
                min={15}
                max={480}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? 'Scheduling…' : 'Schedule'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function SessionRow({
  s,
  student,
  service,
  pkg,
  onChanged,
}: {
  s: ScheduledSessionRow;
  student?: Student;
  service?: ServiceRow;
  pkg?: PackageRow;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function setStatus(status: ScheduleStatus, label: string) {
    setBusy(true);
    try {
      await billingApi.updateSchedule(s.id, { status });
      toast.success(label);
      onChanged();
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function remind() {
    setBusy(true);
    try {
      const res = await billingApi.remindStudent(s.id);
      if (res.status === 'sent') {
        toast.success(`Reminder sent to ${student?.full_name ?? 'student'}`);
      } else if (res.status === 'skipped') {
        toast(`Email service not configured`, {
          description: 'Set RESEND_API_KEY on the backend to deliver reminders.',
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

  const variant = SCHEDULE_STATUS_VARIANTS[s.status] ?? 'secondary';
  const isOpen = s.status === 'scheduled' || s.status === 'confirmed';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background/40 p-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">
          {student?.full_name ?? '(unknown student)'}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {fmtWhen(s.scheduled_for)} · {s.duration_minutes}m ·{' '}
          {fmtCents(s.price_cents)}
          {service ? ` · ${service.name}` : ''}
          {pkg
            ? ` · pkg ${pkg.sessions_remaining}/${pkg.total_sessions}`
            : ' · drop-in'}
        </div>
        {s.notes ? (
          <div className="mt-1 text-xs italic text-muted-foreground">
            {s.notes}
          </div>
        ) : null}
      </div>
      <Badge variant={variant} className="capitalize">
        {s.status.replace('_', ' ')}
      </Badge>
      {isOpen ? (
        <>
          <Button
            size="sm"
            variant="default"
            disabled={busy}
            onClick={() => setStatus('completed', 'Marked completed')}
          >
            <Check className="h-4 w-4" />
            Completed
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => setStatus('no_show', 'Marked no-show')}
          >
            <CircleSlash className="h-4 w-4" />
            No-show
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={remind}
          >
            <Bell className="h-4 w-4" />
            Remind
          </Button>
          <Button
            size="sm"
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
  );
}
