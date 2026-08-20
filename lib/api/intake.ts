import { apiClient } from '@/lib/api';

export type PrimaryGoal =
  | 'compete'
  | 'fitness'
  | 'technique'
  | 'self_defense'
  | 'other';

export interface IntakeRow {
  student_id: string;
  tenant_id: string;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relation?: string | null;
  years_training?: number | null;
  prior_sports?: string | null;
  background?: string | null;
  primary_goal?: PrimaryGoal | null;
  goal_details?: string | null;
  goal_target_date?: string | null;
  completed_at?: string | null;
}

export interface Injury {
  id: string;
  body_area: string;
  description?: string | null;
  occurred_on?: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface Waiver {
  id: string;
  version: number;
  body: string;
  is_active: boolean;
  created_at?: string;
}

export interface WaiverSigned {
  id: string;
  waiver_version: number;
  signed_name: string;
  accepted_at: string;
}

export interface IntakeBundle {
  intake: IntakeRow | null;
  injuries: Injury[];
  waiver_signed: WaiverSigned | null;
}

export interface IntakeUpsertRequest {
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relation?: string | null;
  years_training?: number | null;
  prior_sports?: string | null;
  background?: string | null;
  primary_goal?: PrimaryGoal | null;
  goal_details?: string | null;
  goal_target_date?: string | null;
  mark_complete?: boolean;
}

export const intakeApi = {
  // client (student) — own intake
  getMine: () => apiClient.get<IntakeBundle>('/api/intake/me'),
  upsertMine: (payload: IntakeUpsertRequest) =>
    apiClient.put<IntakeRow>('/api/intake/me', payload),
  addInjury: (payload: {
    body_area: string;
    description?: string;
    occurred_on?: string;
  }) => apiClient.post<Injury>('/api/intake/injuries', payload),
  removeInjury: (id: string) =>
    apiClient.delete<{ removed: boolean; id: string }>(
      `/api/intake/injuries/${encodeURIComponent(id)}`,
    ),

  // waiver
  getActiveWaiver: () => apiClient.get<Waiver | null>('/api/intake/waiver'),
  signWaiver: (payload: { waiver_id: string; signed_name: string }) =>
    apiClient.post<{ signed: boolean }>('/api/intake/waiver/sign', payload),
  upsertWaiver: (body: string) =>
    apiClient.put<Waiver>('/api/intake/waiver', { body }),

  // trainer — view a client's intake
  getStudentIntake: (studentId: string) =>
    apiClient.get<IntakeBundle>(
      `/api/intake/student/${encodeURIComponent(studentId)}`,
    ),
};
