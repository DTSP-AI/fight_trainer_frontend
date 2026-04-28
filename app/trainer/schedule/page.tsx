'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/empty-state';
import {
  billingApi,
  type PackageRow,
  type ScheduledSessionRow,
  type ServiceRow,
} from '@/lib/api/billing';
import { studentsApi } from '@/lib/api/students';
import { describeApiError } from '@/lib/api';
import type { Student } from '@/lib/types';

function fmtCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function fmtWhen(iso: string): string {
  try {
    const dt = new Date(iso);
    return dt.toLocaleString('en-US', {
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

function startOfWeek(d = new Date()): string {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x.toISOString();
}

function plusDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export default function TrainerSchedulePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [sessions, setSessions] = useState<ScheduledSessionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [from] = useState(() => startOfWeek());
  const [to] = useState(() => plusDays(startOfWeek(), 14));

  const refresh = useCallback(async () => {
    try {
      const [s, svcs, sched] = await Promise.all([
        studentsApi.list(),
        billingApi.listServices(),
        billingApi.listScheduled({ from_date: from, to_date: to }),
      ]);
      setStudents(s);
      setServices(svcs);
      setSessions(sched);
    } catch (err) {
      setError(describeApiError(err));
    }
  }, [from, to]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (error) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        {error}
      </p>
    );
  }

  const studentMap = new Map(students.map((s) => [s.id, s]));
  const serviceMap = new Map(services.map((s) => [s.id, s]));

  // Group sessions by date.
  const grouped: Record<string, ScheduledSessionRow[]> = {};
  for (const s of sessions) {
    const key = s.scheduled_for.slice(0, 10);
    grouped[key] = grouped[key] ?? [];
    grouped[key].push(s);
  }
  const dates = Object.keys(grouped).sort();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Schedule</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Next two weeks. Tap Remind to email a student about their session.
          </p>
        </div>
      </div>

      <NewSessionForm
        students={students}
        services={services}
        onCreated={refresh}
      />

      {dates.length === 0 ? (
        <EmptyState
          title="No sessions scheduled"
          description="Use the form above to schedule one."
        />
      ) : (
        dates.map((d) => (
          <Card key={d}>
            <CardHeader>
              <CardTitle className="text-base">
                {new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {grouped[d]!.map((s) => (
                <SessionRow
                  key={s.id}
                  s={s}
                  student={studentMap.get(s.student_id)}
                  service={serviceMap.get(s.service_id)}
                />
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function NewSessionForm({
  students,
  services,
  onCreated,
}: {
  students: Student[];
  services: ServiceRow[];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [packageId, setPackageId] = useState('');
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [scheduledFor, setScheduledFor] = useState('');
  const [duration, setDuration] = useState('60');
  const [price, setPrice] = useState('80');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // When student changes, fetch their packages.
  useEffect(() => {
    if (!studentId) {
      setPackages([]);
      return;
    }
    billingApi
      .listPackages(studentId)
      .then(setPackages)
      .catch(() => setPackages([]));
  }, [studentId]);

  // When package picked, default the service + price.
  useEffect(() => {
    if (!packageId) return;
    const p = packages.find((x) => x.id === packageId);
    if (p) {
      setServiceId(p.service_id);
      setPrice((p.price_per_session_cents / 100).toFixed(2));
    }
  }, [packageId, packages]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
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
      setOpen(false);
      setNotes('');
      setScheduledFor('');
      onCreated();
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="outline">
        <Plus className="h-4 w-4" />
        Schedule a session
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Schedule a session</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
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
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Package (optional)</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={packageId}
                onChange={(e) => setPackageId(e.target.value)}
                disabled={!packages.length}
              >
                <option value="">— none (drop-in) —</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sessions_remaining}/{p.total_sessions} left · {fmtCents(p.price_per_session_cents)}/session
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Picks consumes 1 credit on schedule.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Service</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                required
              >
                <option value="">Pick a service…</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduled_for">When</Label>
              <Input
                id="scheduled_for"
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (min)</Label>
              <Input
                id="duration"
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
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Scheduling…' : 'Schedule'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
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
}: {
  s: ScheduledSessionRow;
  student?: Student;
  service?: ServiceRow;
}) {
  const [sending, setSending] = useState(false);

  async function remind() {
    setSending(true);
    try {
      const res = await billingApi.remindStudent(s.id);
      if (res.status === 'sent') {
        toast.success(`Reminder sent to ${student?.full_name ?? 'student'}`);
      } else if (res.status === 'skipped') {
        toast(`Email service not configured — set RESEND_API_KEY on backend.`, {
          description: 'Reminder logged but not delivered.',
        });
      } else {
        toast.error(res.error ?? 'Reminder failed');
      }
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background/40 p-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">
          {student?.full_name ?? 'Unknown student'}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {fmtWhen(s.scheduled_for)} · {s.duration_minutes}m · {fmtCents(s.price_cents)}
          {service ? ` · ${service.name}` : ''}
          {s.package_id ? ' · package' : ' · drop-in'}
        </div>
        {s.notes ? (
          <div className="mt-1 text-xs italic text-muted-foreground">
            {s.notes}
          </div>
        ) : null}
      </div>
      <Badge variant={s.status === 'cancelled' ? 'destructive' : 'secondary'}>
        {s.status}
      </Badge>
      {s.status === 'scheduled' ? (
        <Button size="sm" variant="outline" onClick={remind} disabled={sending}>
          <Bell className="h-4 w-4" />
          {sending ? '…' : 'Remind'}
        </Button>
      ) : null}
      <Button asChild size="sm" variant="ghost">
        <Link href={`/trainer/students/${s.student_id}/billing`}>Billing</Link>
      </Button>
    </div>
  );
}
