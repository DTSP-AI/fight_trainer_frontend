import { apiClient } from '@/lib/api';

// ============================================================================
// Student calendar sync — mirrors backend/app/api/student_calendar.py
// ============================================================================

export interface StudentCalendarStatus {
  /** True once a calendar app has actually pulled the feed (observed, not a checkbox). */
  synced: boolean;
  last_fetched_at: string | null;
  snoozed_until: string | null;
  /** Banner shows when true: not synced and not snoozed. */
  nudge_due: boolean;
  /** Coach has Google connected → the student also gets Google invites per session. */
  coach_calendar_connected: boolean;
  feed_url: string;
  webcal_url: string;
  google_subscribe_url: string;
}

export const studentCalendarApi = {
  status: () => apiClient.get<StudentCalendarStatus>('/api/student/calendar'),

  /** Hide the nudge for 7 days. */
  snooze: () =>
    apiClient.post<{ snoozed_until: string }>('/api/student/calendar/snooze'),

  /** New secret link. Old link stops working; synced resets. */
  rotate: () => apiClient.post<StudentCalendarStatus>('/api/student/calendar/rotate'),
} as const;
