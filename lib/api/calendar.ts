import { apiClient } from '@/lib/api';

// ============================================================================
// Unified calendar event — produced by GET /api/calendar/events.
// Discriminated by `kind`.
// ============================================================================

export type CalendarEventKind = 'scheduled' | 'planned';

export interface CalendarEventBase {
  id: string;
  kind: CalendarEventKind;
  starts_at: string; // ISO
  duration_minutes?: number | null;
  student_id: string;
  notes?: string | null;
  fulfilled_session_id?: string | null;
}

export interface ScheduledEvent extends CalendarEventBase {
  kind: 'scheduled';
  service_id?: string | null;
  package_id?: string | null;
  price_cents?: number | null;
  status?:
    | 'scheduled'
    | 'confirmed'
    | 'completed'
    | 'no_show'
    | 'cancelled'
    | null;
}

export interface PlannedEvent extends CalendarEventBase {
  kind: 'planned';
  session_type?:
    | 'drilling'
    | 'sparring'
    | 'strength'
    | 'recovery'
    | 'padwork'
    | 'conditioning'
    | null;
  plan_id: string;
  plan_focus?: string | null;
}

export type CalendarEvent = ScheduledEvent | PlannedEvent;

export interface MissedSweepResult {
  swept_scheduled: number;
  notifications_sent: number;
}

// ============================================================================
// API client
// ============================================================================

export const calendarApi = {
  events: (params?: {
    from_date?: string;
    to_date?: string;
    student_id?: string;
    include_planned?: boolean;
  }) => {
    const qs = new URLSearchParams();
    if (params?.from_date) qs.set('from_date', params.from_date);
    if (params?.to_date) qs.set('to_date', params.to_date);
    if (params?.student_id) qs.set('student_id', params.student_id);
    if (params?.include_planned === false) qs.set('include_planned', 'false');
    const tail = qs.toString();
    return apiClient.get<CalendarEvent[]>(
      `/api/calendar/events${tail ? `?${tail}` : ''}`,
    );
  },
  missed: () =>
    apiClient.get<CalendarEvent[]>('/api/calendar/missed'),
  sweepMissed: () =>
    apiClient.post<MissedSweepResult>('/api/calendar/sweep-missed', {}),
};
