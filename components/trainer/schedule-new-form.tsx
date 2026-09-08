'use client';

import { useMemo, useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AssistedTextarea } from '@/components/common/assisted-textarea';
import {
  billingApi,
  type PackageRow,
  type ServiceRow,
} from '@/lib/api/billing';
import { describeApiError } from '@/lib/api';
import type { Student } from '@/lib/types';

function fmtCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export function ScheduleNewForm({
  students,
  services,
  packages,
  onCreated,
  open,
  onOpenChange,
  defaultDateTime,
  defaultStudentId,
}: {
  students: Student[];
  services: ServiceRow[];
  packages: PackageRow[];
  onCreated: () => void;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  defaultDateTime?: string;
  defaultStudentId?: string;
}) {
  const [studentId, setStudentId] = useState(defaultStudentId ?? '');
  const [packageId, setPackageId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [scheduledFor, setScheduledFor] = useState(defaultDateTime ?? '');

  // Adopt a freshly-picked day from the calendar, and a student deep-linked
  // from their detail page (?student=<id>). React's documented way to adjust
  // state when a prop changes is to compare against the previous prop during
  // render — not to assign it from an effect.
  const [prevDefaultDateTime, setPrevDefaultDateTime] =
    useState(defaultDateTime);
  if (defaultDateTime !== prevDefaultDateTime) {
    setPrevDefaultDateTime(defaultDateTime);
    if (defaultDateTime) setScheduledFor(defaultDateTime);
  }

  const [prevDefaultStudentId, setPrevDefaultStudentId] =
    useState(defaultStudentId);
  if (defaultStudentId !== prevDefaultStudentId) {
    setPrevDefaultStudentId(defaultStudentId);
    if (defaultStudentId) setStudentId(defaultStudentId);
  }
  const [duration, setDuration] = useState('60');
  const [price, setPrice] = useState('80');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  // Packages for the picked student that still have credit.
  const studentPackages = useMemo(
    () =>
      packages.filter(
        (p) =>
          (p.student_id === studentId ||
            (p.shared_student_ids ?? []).includes(studentId)) &&
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
            <AssistedTextarea
              id="notes"
              rows={2}
              value={notes}
              onChange={setNotes}
              assistKind="schedule_notes"
              assistStudentId={studentId || null}
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
