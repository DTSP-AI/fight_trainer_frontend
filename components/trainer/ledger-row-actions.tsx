'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { billingApi } from '@/lib/api/billing';
import { bookingApi, type ApproveBody, type MarkPaidMethod } from '@/lib/api/calendar';
import { sessionsApi } from '@/lib/api/sessions';
import { ApiClientError, describeApiError } from '@/lib/api';

/**
 * The ONE set of coach actions on a booking. The session ledger, the
 * calendar dialog and the dashboard all call these — never their own copy —
 * so "Mark done" cannot grow a second meaning again.
 *
 * "Mark done" is POST /api/sessions with the linkage id. There is no
 * status-only complete: the backend answers 409 USE_LIFECYCLE_ENDPOINT to
 * a PATCH {status:'completed'} and this module never sends one.
 */

export const MARK_PAID_METHODS: MarkPaidMethod[] = ['cash', 'venmo', 'zelle', 'other'];

export function fmtCents(cents: number | null | undefined): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format((cents ?? 0) / 100);
}

export function fmtWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Minimal shape every action needs — a ledger row or a calendar event. */
export interface BookingLike {
  id: string;
  student_id: string;
  /** ISO start. */
  starts_at: string;
  duration_minutes?: number | null;
}

export interface MarkDoneTarget {
  kind: 'scheduled' | 'planned';
  id: string;
  student_id: string;
  starts_at: string;
  duration_minutes?: number | null;
}

export function useBookingActions({
  onChanged,
  studentName,
}: {
  onChanged: () => void;
  studentName?: string | null;
}) {
  const [busy, setBusy] = useState(false);

  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(true);
    try {
      return await fn();
    } finally {
      setBusy(false);
    }
  }

  /** Returns true on PACKAGE_EXHAUSTED so the caller can offer drop-in. */
  async function approve(id: string, body: ApproveBody = {}): Promise<'ok' | 'exhausted' | 'error'> {
    return (
      (await run(async () => {
        try {
          const res = await bookingApi.approve(id, body);
          if (res.checkout_url) {
            toast.success('Approved — awaiting payment', {
              description: 'The client got a pay link. It locks in once paid.',
            });
          } else {
            toast.success('Approved — locked in');
          }
          onChanged();
          return 'ok' as const;
        } catch (err) {
          if (err instanceof ApiClientError && err.code === 'PACKAGE_EXHAUSTED') {
            toast.error('That package is out of credits.', {
              description: 'Approve as a drop-in, or sell a new package first.',
            });
            return 'exhausted' as const;
          }
          toast.error(describeApiError(err));
          return 'error' as const;
        }
      })) ?? 'error'
    );
  }

  async function decline(id: string, reason?: string) {
    await run(async () => {
      try {
        await bookingApi.decline(id, reason?.trim() ? { reason: reason.trim() } : {});
        toast.success('Request declined');
        onChanged();
      } catch (err) {
        toast.error(describeApiError(err));
      }
    });
  }

  async function waivePayment(id: string) {
    await run(async () => {
      try {
        await bookingApi.waivePayment(id);
        toast.success('Payment waived — locked in');
        onChanged();
      } catch (err) {
        toast.error(describeApiError(err));
      }
    });
  }

  async function markPaid(id: string, method: MarkPaidMethod, notes?: string) {
    await run(async () => {
      try {
        await bookingApi.markPaid(id, {
          method,
          ...(notes?.trim() ? { notes: notes.trim() } : {}),
        });
        toast.success('Payment recorded — locked in');
        onChanged();
      } catch (err) {
        toast.error(describeApiError(err));
      }
    });
  }

  async function copyPayLink(id: string) {
    await run(async () => {
      try {
        const res = await bookingApi.checkout(id);
        await navigator.clipboard.writeText(res.checkout_url);
        toast.success('Pay link copied');
      } catch (err) {
        toast.error(describeApiError(err));
      }
    });
  }

  async function remind(id: string) {
    await run(async () => {
      try {
        const res = await billingApi.remindStudent(id);
        if (res.status === 'sent') {
          toast.success(`Reminder sent to ${studentName ?? 'client'}`);
        } else if (res.status === 'skipped') {
          toast('Email service not configured', {
            description: 'Set RESEND_API_KEY on the backend to deliver reminders.',
          });
        } else {
          toast.error(res.error ?? 'Reminder failed');
        }
      } catch (err) {
        toast.error(describeApiError(err));
      }
    });
  }

  /** The canonical fulfilment path. Creates the session log that marks the
   *  booking (or plan item) done. */
  async function markDone(target: MarkDoneTarget) {
    await run(async () => {
      try {
        await sessionsApi.create({
          student_id: target.student_id,
          session_date: target.starts_at.slice(0, 10),
          duration_minutes: target.duration_minutes ?? null,
          mode: 'text',
          quick_log: true,
          scheduled_session_id: target.kind === 'scheduled' ? target.id : null,
          planned_session_id: target.kind === 'planned' ? target.id : null,
        });
        toast.success('Marked done');
        onChanged();
      } catch (err) {
        toast.error(describeApiError(err));
      }
    });
  }

  /** The only statuses PATCH accepts. */
  async function setStatus(id: string, next: 'no_show' | 'cancelled') {
    await run(async () => {
      try {
        await billingApi.updateSchedule(id, { status: next });
        toast.success(next === 'no_show' ? 'Marked no-show' : 'Cancelled');
        onChanged();
      } catch (err) {
        toast.error(describeApiError(err));
      }
    });
  }

  /** Move a booking (time / length / notes). The only non-status PATCH. */
  async function reschedule(
    id: string,
    patch: { scheduled_for?: string; duration_minutes?: number; notes?: string },
  ): Promise<boolean> {
    return (
      (await run(async () => {
        try {
          await billingApi.updateSchedule(id, patch);
          toast.success('Session updated');
          onChanged();
          return true;
        } catch (err) {
          toast.error(describeApiError(err));
          return false;
        }
      })) ?? false
    );
  }

  /** Book the same session seven days later — same service, same package
   *  (if it still has credit), same duration and price. */
  async function repeatNextWeek(row: {
    student_id: string;
    service_id: string;
    package_id?: string | null;
    scheduled_for: string;
    duration_minutes: number;
    price_cents: number;
  }) {
    await run(async () => {
      const next = new Date(row.scheduled_for);
      next.setDate(next.getDate() + 7);
      try {
        await billingApi.scheduleSession({
          student_id: row.student_id,
          service_id: row.service_id,
          package_id: row.package_id ?? undefined,
          scheduled_for: next.toISOString(),
          duration_minutes: row.duration_minutes,
          price_cents: row.price_cents,
        });
        toast.success(`Booked for ${fmtWhen(next.toISOString())}`);
        onChanged();
      } catch (err) {
        if (err instanceof ApiClientError && err.code === 'PACKAGE_EXHAUSTED') {
          toast.error('Package is out of credits — book it as a drop-in or sell a new package.');
        } else if (err instanceof ApiClientError && err.code === 'SLOT_TAKEN') {
          toast.error('That slot is taken next week — pick another time.');
        } else {
          toast.error(describeApiError(err));
        }
      }
    });
  }

  async function deleteBooking(id: string) {
    if (!window.confirm('Delete this session? This cannot be undone.')) return;
    await run(async () => {
      try {
        await billingApi.deleteSchedule(id);
        toast.success('Deleted');
        onChanged();
      } catch (err) {
        toast.error(describeApiError(err));
      }
    });
  }

  return {
    busy,
    approve,
    decline,
    waivePayment,
    markPaid,
    copyPayLink,
    remind,
    markDone,
    setStatus,
    reschedule,
    repeatNextWeek,
    deleteBooking,
  };
}

export type BookingActions = ReturnType<typeof useBookingActions>;

/** Method + notes fields shared by "approve + mark paid" and "mark paid". */
export function MarkPaidFields({
  method,
  onMethod,
  notes,
  onNotes,
  busy,
  submitLabel,
  onSubmit,
  onBack,
  idPrefix = 'mark-paid',
}: {
  method: MarkPaidMethod;
  onMethod: (m: MarkPaidMethod) => void;
  notes: string;
  onNotes: (v: string) => void;
  busy: boolean;
  submitLabel: string;
  onSubmit: () => void;
  onBack: () => void;
  idPrefix?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="space-y-2">
        <Label>How did they pay?</Label>
        <Select
          value={method}
          onValueChange={(v) => onMethod(v as MarkPaidMethod)}
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
        <Label htmlFor={`${idPrefix}-notes`}>Notes (optional)</Label>
        <Input
          id={`${idPrefix}-notes`}
          value={notes}
          onChange={(e) => onNotes(e.target.value)}
          placeholder="Reference / who handed it over"
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" disabled={busy} onClick={onSubmit}>
          {submitLabel}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={onBack}>
          Back
        </Button>
      </div>
    </div>
  );
}
