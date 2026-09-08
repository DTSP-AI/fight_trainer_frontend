import type { CalendarEvent } from '@/lib/api/calendar';

/**
 * Shared calendar colour tokens — used by BOTH the coach and the client
 * calendars so "Waiting on approval" looks the same on every screen.
 *
 * Classes for the pre-existing statuses are copied verbatim from the old
 * SCHEDULED_TONES/Legend inside sessions-calendar.tsx: visual equivalence is
 * a requirement, not a nice-to-have.
 */

export type ScheduleTone =
  | 'available'
  | 'pending_approval'
  | 'awaiting_payment'
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'no_show'
  | 'cancelled'
  | 'declined'
  | 'planned'
  | 'plan_done';

/** Chip classes — applied to the little buttons inside a day cell. */
export const TONES: Record<ScheduleTone, string> = {
  available:
    'border border-dashed border-emerald-400/60 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20',
  pending_approval:
    'border-amber-500/50 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25',
  awaiting_payment:
    'border-orange-500/50 bg-orange-500/15 text-orange-100 hover:bg-orange-500/25',
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
  declined:
    'border-zinc-500/50 bg-zinc-500/15 text-zinc-300 line-through hover:bg-zinc-500/25',
  planned:
    'border border-dashed border-violet-400/60 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20',
  plan_done:
    'border border-dashed border-emerald-400/60 bg-emerald-500/10 text-emerald-100',
};

/** Legend dot classes. */
export const TONE_DOTS: Record<ScheduleTone, string> = {
  available: 'bg-emerald-400 ring-1 ring-emerald-300/60',
  pending_approval: 'bg-amber-500',
  awaiting_payment: 'bg-orange-500',
  scheduled: 'bg-sky-500',
  confirmed: 'bg-blue-500',
  completed: 'bg-emerald-500',
  no_show: 'bg-amber-500',
  cancelled: 'bg-rose-500',
  declined: 'bg-zinc-500',
  planned: 'bg-violet-500',
  plan_done: 'bg-emerald-500',
};

export const STATUS_LABEL: Record<ScheduleTone, string> = {
  available: 'Available',
  pending_approval: 'Waiting on approval',
  awaiting_payment: 'Approved · awaiting payment',
  scheduled: 'Scheduled',
  confirmed: 'Scheduled',
  completed: 'Logged',
  no_show: 'No-show',
  cancelled: 'Cancelled',
  declined: 'Declined',
  planned: 'Plan',
  plan_done: 'Plan · logged',
};

/** Which tone a calendar event renders in. */
export function eventTone(ev: CalendarEvent): ScheduleTone {
  if (ev.kind === 'planned') {
    return ev.fulfilled_session_id ? 'plan_done' : 'planned';
  }
  const status = ev.status ?? 'scheduled';
  return status in TONES ? (status as ScheduleTone) : 'scheduled';
}

/** Human label for a calendar event's state. */
export function eventStatusLabel(ev: CalendarEvent): string {
  return STATUS_LABEL[eventTone(ev)];
}
