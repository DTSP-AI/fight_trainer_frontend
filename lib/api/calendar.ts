import { apiClient } from '@/lib/api';
import type { ScheduledSessionRow } from '@/lib/api/billing';

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
    | 'pending_approval'
    | 'awaiting_payment'
    | 'scheduled'
    | 'confirmed'
    | 'completed'
    | 'no_show'
    | 'cancelled'
    | 'declined'
    | null;
  // Booking / approval / payment stamps (migration 043).
  requested_by_student_at?: string | null;
  approved_at?: string | null;
  paid_at?: string | null;
  payment_waived_at?: string | null;
  locked_at?: string | null;
  declined_at?: string | null;
  decline_reason?: string | null;
  cancellation_reason?: string | null;
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
  // Note: there is no markComplete endpoint. "Mark done" routes through
  // sessionsApi.create with quick_log=true and the appropriate linkage IDs.
};

// ============================================================================
// Coach availability — GET/PATCH /api/availability/*
// ============================================================================

export interface AvailabilitySettings {
  timezone: string;
}

export interface AvailabilityRule {
  id: string;
  tenant_id: string;
  /** 0 = Sunday … 6 = Saturday. */
  day_of_week: number;
  /** "HH:MM" (or "HH:MM:SS" straight off Postgres `time`). */
  start_time: string;
  end_time: string;
  slot_minutes: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AvailabilityRuleCreate {
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_minutes?: number;
  is_active?: boolean;
}

export type AvailabilityRuleUpdate = Partial<AvailabilityRuleCreate>;

export interface AvailabilityBlock {
  id: string;
  tenant_id: string;
  starts_at: string;
  ends_at: string;
  reason?: string | null;
  created_at?: string;
}

export interface AvailabilityBlockCreate {
  starts_at: string;
  ends_at: string;
  reason?: string;
}

export interface AvailableSlot {
  starts_at: string; // UTC ISO
  ends_at: string; // UTC ISO
  duration_minutes: number;
}

/** Trimmed service shape the slots endpoint embeds so clients can book
 *  without the trainer-only /api/services list. */
export interface BookableService {
  id: string;
  name: string;
  default_duration_minutes: number;
  default_price_cents: number;
}

export interface SlotsResponse {
  timezone: string;
  slots: AvailableSlot[];
  services: BookableService[];
}

export const availabilityApi = {
  settings: () =>
    apiClient.get<AvailabilitySettings>('/api/availability/settings'),
  updateSettings: (payload: { timezone: string }) =>
    apiClient.patch<AvailabilitySettings>('/api/availability/settings', payload),

  rules: () => apiClient.get<AvailabilityRule[]>('/api/availability/rules'),
  createRule: (payload: AvailabilityRuleCreate) =>
    apiClient.post<AvailabilityRule>('/api/availability/rules', payload),
  updateRule: (ruleId: string, payload: AvailabilityRuleUpdate) =>
    apiClient.patch<AvailabilityRule>(
      `/api/availability/rules/${encodeURIComponent(ruleId)}`,
      payload,
    ),
  deleteRule: (ruleId: string) =>
    apiClient.delete<{ deleted: boolean; id: string }>(
      `/api/availability/rules/${encodeURIComponent(ruleId)}`,
    ),

  blocks: (params?: { from_date?: string; to_date?: string }) => {
    const search = new URLSearchParams();
    if (params?.from_date) search.set('from_date', params.from_date);
    if (params?.to_date) search.set('to_date', params.to_date);
    const qs = search.toString();
    return apiClient.get<AvailabilityBlock[]>(
      `/api/availability/blocks${qs ? `?${qs}` : ''}`,
    );
  },
  createBlock: (payload: AvailabilityBlockCreate) =>
    apiClient.post<AvailabilityBlock>('/api/availability/blocks', payload),
  deleteBlock: (blockId: string) =>
    apiClient.delete<{ deleted: boolean; id: string }>(
      `/api/availability/blocks/${encodeURIComponent(blockId)}`,
    ),

  slots: (params?: { from_date?: string; to_date?: string }) => {
    const search = new URLSearchParams();
    if (params?.from_date) search.set('from_date', params.from_date);
    if (params?.to_date) search.set('to_date', params.to_date);
    const qs = search.toString();
    return apiClient.get<SlotsResponse>(
      `/api/availability/slots${qs ? `?${qs}` : ''}`,
    );
  },
};

// ============================================================================
// Booking — client requests, coach approval, payment lock
// ============================================================================

export type MarkPaidMethod = 'cash' | 'venmo' | 'zelle' | 'other';

export interface MarkPaidBody {
  method: MarkPaidMethod;
  notes?: string;
}

export interface SessionRequestCreate {
  starts_at: string; // UTC ISO — must be an offered slot start
  service_id: string;
  package_id?: string;
  notes?: string;
}

export interface ApproveBody {
  waive_payment?: boolean;
  mark_paid?: MarkPaidBody;
  /** Re-approve as a drop-in after PACKAGE_EXHAUSTED. */
  drop_package?: boolean;
}

export interface ApproveResult {
  session: ScheduledSessionRow;
  checkout_url?: string | null;
}

export interface SessionCheckoutResponse {
  checkout_url: string;
  session_id: string;
}

const SESSIONS = '/api/scheduled-sessions';

export const bookingApi = {
  request: (payload: SessionRequestCreate) =>
    apiClient.post<ScheduledSessionRow>(`${SESSIONS}/request`, payload),
  approve: (sessionId: string, payload: ApproveBody = {}) =>
    apiClient.post<ApproveResult>(
      `${SESSIONS}/${encodeURIComponent(sessionId)}/approve`,
      payload,
    ),
  decline: (sessionId: string, payload: { reason?: string } = {}) =>
    apiClient.post<ScheduledSessionRow>(
      `${SESSIONS}/${encodeURIComponent(sessionId)}/decline`,
      payload,
    ),
  waivePayment: (sessionId: string) =>
    apiClient.post<ScheduledSessionRow>(
      `${SESSIONS}/${encodeURIComponent(sessionId)}/waive-payment`,
      {},
    ),
  markPaid: (sessionId: string, payload: MarkPaidBody) =>
    apiClient.post<ScheduledSessionRow>(
      `${SESSIONS}/${encodeURIComponent(sessionId)}/mark-paid`,
      payload,
    ),
  checkout: (sessionId: string) =>
    apiClient.post<SessionCheckoutResponse>(
      `${SESSIONS}/${encodeURIComponent(sessionId)}/checkout`,
      {},
    ),
  cancelRequest: (sessionId: string, payload: { reason?: string } = {}) =>
    apiClient.post<ScheduledSessionRow>(
      `${SESSIONS}/${encodeURIComponent(sessionId)}/cancel-request`,
      payload,
    ),
};
