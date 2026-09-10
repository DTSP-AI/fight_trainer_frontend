'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AssistedTextarea } from '@/components/common/assisted-textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { studentsApi } from '@/lib/api/students';
import { sessionsApi } from '@/lib/api/sessions';
import { billingApi, type PackageRow, type ServiceRow } from '@/lib/api/billing';
import { describeApiError } from '@/lib/api';
import type { Student } from '@/lib/types';

const schema = z.object({
  student_id: z.string().min(1, 'Pick a student'),
  session_date: z.string().min(1, 'Required'),
  // Everything below is optional — only filled when the trainer opens the
  // "Add details" disclosure.
  duration_minutes: z.string().optional(),
  notes: z.string().optional(),
  coaching_cues: z.string().optional(),
  voice_transcript: z.string().optional(),
  sparring_rounds_count: z.string().optional(),
  student_self_rating: z.string().optional(),
  // Walk-in lane (D1) — how this session is paid for when it wasn't booked.
  // 'pkg:<id>' burns a credit, 'svc:<id>' is a drop-in at the list price.
  funding: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function toNumOrNull(v: string | undefined): number | null {
  if (v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const today = () => new Date().toISOString().slice(0, 10);

function fmtCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export function SessionLogForm() {
  const router = useRouter();
  const params = useSearchParams();
  const initialStudent = params.get('studentId') ?? '';
  const initialDate = params.get('date') ?? '';
  const scheduledSessionId = params.get('scheduledSessionId');
  const plannedSessionId = params.get('plannedSessionId');

  const [students, setStudents] = useState<Student[] | null>(null);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      student_id: initialStudent,
      session_date: initialDate || today(),
    },
  });

  const studentId = useWatch({ control, name: 'student_id' });
  const funding = useWatch({ control, name: 'funding' });
  const notes = useWatch({ control, name: 'notes' });
  const cues = useWatch({ control, name: 'coaching_cues' });
  const transcript = useWatch({ control, name: 'voice_transcript' });

  useEffect(() => {
    let cancelled = false;
    studentsApi
      .list()
      .then((res) => {
        if (!cancelled) setStudents(res);
      })
      .catch((err: unknown) => toast.error(describeApiError(err)));
    return () => {
      cancelled = true;
    };
  }, []);

  // A walk-in (no booking) must land on the client's ledger with a payment
  // state, so the form needs the packages and services to pick from. Booked
  // sessions already carry theirs — skip the fetch.
  const isWalkIn = !scheduledSessionId;
  useEffect(() => {
    if (!isWalkIn) return;
    let cancelled = false;
    Promise.all([billingApi.listServices(), billingApi.listAllPackages('active')])
      .then(([svcs, pkgs]) => {
        if (cancelled) return;
        setServices(svcs);
        setPackages(pkgs);
      })
      .catch((err: unknown) => toast.error(describeApiError(err)));
    return () => {
      cancelled = true;
    };
  }, [isWalkIn]);

  const fundingOptions = useMemo(() => {
    if (!isWalkIn || !studentId) return [];
    const pkgs = packages.filter(
      (p) =>
        (p.student_id === studentId || (p.shared_student_ids ?? []).includes(studentId)) &&
        p.status === 'active' &&
        p.sessions_remaining > 0,
    );
    const svcById = new Map(services.map((sv) => [sv.id, sv]));
    return [
      ...pkgs.map((p) => ({
        value: `pkg:${p.id}`,
        label: `${svcById.get(p.service_id)?.name ?? 'Package'} · ${p.sessions_remaining}/${p.total_sessions} credits${
          p.payment_status !== 'paid' ? ' · package unpaid' : ''
        }`,
      })),
      ...services
        .filter((sv) => sv.is_active)
        .map((sv) => ({
          value: `svc:${sv.id}`,
          label: `Drop-in · ${sv.name} · ${fmtCents(sv.default_price_cents)}`,
        })),
    ];
  }, [isWalkIn, studentId, packages, services]);

  // Default to the first package with credit once the options exist —
  // derived during render, not assigned from an effect.
  const [autoPickedFor, setAutoPickedFor] = useState<string | null>(null);
  if (isWalkIn && studentId && fundingOptions.length > 0 && autoPickedFor !== studentId) {
    setAutoPickedFor(studentId);
    const first = fundingOptions[0];
    if (first && (!funding || !fundingOptions.some((o) => o.value === funding))) {
      setValue('funding', first.value);
    }
  }

  function walkInPayload(f: string | undefined) {
    if (!isWalkIn || !f) return null;
    if (f.startsWith('pkg:')) {
      const pkg = packages.find((p) => p.id === f.slice(4));
      if (!pkg) return null;
      return { service_id: pkg.service_id, package_id: pkg.id };
    }
    if (f.startsWith('svc:')) return { service_id: f.slice(4), package_id: null };
    return null;
  }

  async function onSubmit(values: FormValues) {
    const walkIn = walkInPayload(values.funding);
    if (isWalkIn && fundingOptions.length > 0 && !walkIn) {
      toast.error('Pick how this session is paid for.');
      return;
    }
    setSubmitting(true);
    try {
      // If the trainer didn't fill any AI signal (notes/cues/transcript),
      // skip the analysis pipeline. It's a no-op without those fields.
      const hasSignal = !!(
        values.notes?.trim() ||
        values.coaching_cues?.trim() ||
        values.voice_transcript?.trim()
      );
      const created = await sessionsApi.create({
        student_id: values.student_id,
        session_date: values.session_date,
        duration_minutes: toNumOrNull(values.duration_minutes),
        notes: values.notes || null,
        coaching_cues: values.coaching_cues || null,
        voice_transcript: values.voice_transcript || null,
        sparring_rounds_count: toNumOrNull(values.sparring_rounds_count),
        student_self_rating: toNumOrNull(values.student_self_rating),
        mode: 'text',
        scheduled_session_id: scheduledSessionId || null,
        planned_session_id: plannedSessionId || null,
        quick_log: !hasSignal,
        walk_in: walkIn,
      });
      toast.success(
        hasSignal ? 'Logged. Pipeline kicked off.' : 'Marked logged.',
      );
      router.push(`/trainer/sessions/${created.session_id}`);
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  const linkedToCalendar = !!(scheduledSessionId || plannedSessionId);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid max-w-2xl gap-6"
      noValidate
    >
      {linkedToCalendar ? (
        <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-100">
          This will mark the calendar event as <strong>completed</strong>.
        </p>
      ) : null}

      {/* The two fields that matter every time. */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label>Student</Label>
          <Select
            value={studentId}
            onValueChange={(v) => setValue('student_id', v)}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={students ? 'Pick a student' : 'Loading…'}
              />
            </SelectTrigger>
            <SelectContent>
              {(students ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.student_id ? (
            <p className="text-xs text-destructive">
              {errors.student_id.message}
            </p>
          ) : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="session_date">Date</Label>
          <Input
            id="session_date"
            type="date"
            {...register('session_date')}
          />
        </div>
      </div>

      {isWalkIn && studentId && fundingOptions.length > 0 ? (
        <div className="grid gap-2">
          <Label>Paid how?</Label>
          <Select value={funding ?? ''} onValueChange={(v) => setValue('funding', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Pick a package or drop-in" />
            </SelectTrigger>
            <SelectContent>
              {fundingOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            A walk-in still lands on the client&apos;s ledger: a package burns one credit, a drop-in
            shows as owed until you mark it paid.
          </p>
        </div>
      ) : null}
      {isWalkIn && studentId && fundingOptions.length === 0 && services.length > 0 ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">
          No active service or package to charge this to — the session will be logged without a
          ledger row. Set up a service under Settings first.
        </p>
      ) : null}

      {/* Everything else hidden by default. */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 self-start text-xs text-muted-foreground hover:text-foreground"
      >
        {expanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
        {expanded
          ? 'Hide details'
          : 'Add details + run AI analysis (optional)'}
      </button>

      {expanded ? (
        <div className="grid gap-4 rounded-md border border-border bg-card/40 p-4">
          <p className="text-xs text-muted-foreground">
            Filling notes, cues, or a transcript triggers the analysis
            pipeline so the student gets clip recommendations within ~90s.
            Leave them blank for a plain check-off.
          </p>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <AssistedTextarea
              id="notes"
              rows={4}
              placeholder="What we worked. What landed in live. What broke down."
              value={notes ?? ''}
              onChange={(v) =>
                setValue('notes', v, { shouldDirty: true })
              }
              assistKind="session_notes"
              assistStudentId={studentId || null}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="coaching_cues">Coaching cues</Label>
            <AssistedTextarea
              id="coaching_cues"
              rows={2}
              placeholder="The 1-3 things you'd repeat in your student's ear."
              value={cues ?? ''}
              onChange={(v) =>
                setValue('coaching_cues', v, { shouldDirty: true })
              }
              assistKind="coaching_cues"
              assistStudentId={studentId || null}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="duration_minutes">Duration (min)</Label>
              <Input
                id="duration_minutes"
                type="number"
                min={1}
                inputMode="numeric"
                {...register('duration_minutes')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sparring_rounds_count">Rounds</Label>
              <Input
                id="sparring_rounds_count"
                type="number"
                min={0}
                inputMode="numeric"
                {...register('sparring_rounds_count')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="student_self_rating">Self-rating (1-10)</Label>
              <Input
                id="student_self_rating"
                type="number"
                min={1}
                max={10}
                inputMode="numeric"
                {...register('student_self_rating')}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="voice_transcript">
              Voice transcript (optional)
            </Label>
            <AssistedTextarea
              id="voice_transcript"
              rows={3}
              placeholder="Paste a dictation transcript — the pipeline reads it if present."
              value={transcript ?? ''}
              onChange={(v) =>
                setValue('voice_transcript', v, { shouldDirty: true })
              }
              assistKind="voice_transcript"
              assistStudentId={studentId || null}
            />
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting
            ? 'Saving…'
            : notes || cues || transcript
              ? 'Log + run analysis'
              : 'Mark logged'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={submitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
