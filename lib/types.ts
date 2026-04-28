/**
 * TypeScript mirrors of backend Pydantic models in
 * `Fight_Trainer/backend/app/models/contracts.py` plus DB row shapes from
 * `Fight_Trainer/backend/app/api/*.py`.
 *
 * If any field drifts from the backend, this file is wrong — fix here, not
 * the call sites.
 */

// ---------- Enums ----------
export type Sport =
  | 'bjj'
  | 'mma'
  | 'muay_thai'
  | 'boxing'
  | 'wrestling'
  | 'kickboxing';

export type SkillLevel =
  | 'white'
  | 'blue'
  | 'purple'
  | 'brown'
  | 'black'
  | 'pro';

export type UserRole = 'trainer' | 'student' | 'dtsp_admin';

export type SessionStatus =
  | 'logged'
  | 'processing'
  | 'completed'
  | 'error';

export type SessionMode = 'text' | 'realtime_voice';

export type SessionType =
  | 'drilling'
  | 'sparring'
  | 'strength'
  | 'recovery'
  | 'padwork'
  | 'conditioning';

export type DeliveryChannel = 'in_app' | 'email' | 'sms';

// ---------- Envelope ----------
export type ApiError = {
  code: string;
  message: string;
  request_id?: string | null;
};

export type ApiSuccess<T> = { data: T; error: null };
export type ApiFailure = { data: null; error: ApiError };
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

// ---------- Auth ----------
export interface TrainerSignupRequest {
  email: string;
  full_name: string;
  tenant_name: string;
  primary_sport: Sport;
}

export interface TrainerSignupResponse {
  tenant_id: string;
  user_id: string;
  magic_link_sent: boolean;
}

export interface StudentInviteAcceptRequest {
  invite_token: string;
  full_name: string;
}

// ---------- Domain rows ----------
export interface Tenant {
  id: string;
  name: string;
  head_coach_user_id: string;
  primary_sport: Sport;
  created_at?: string;
}

export interface UserRow {
  id: string;
  email: string;
  role: UserRole;
  tenant_id: string;
  full_name?: string | null;
}

export interface Student {
  id: string;
  tenant_id: string;
  full_name: string;
  primary_sport: Sport;
  // BJJ-only field. Null for MMA/Boxing/Muay Thai/Wrestling/Kickboxing.
  skill_level: SkillLevel | null;
  started_training_at?: string | null;
  notes?: string | null;
  invite_email?: string | null;
  invite_status?: 'pending' | 'accepted' | 'n/a' | null;
  created_at?: string;
}

export interface StudentCreateRequest {
  full_name: string;
  primary_sport: Sport;
  skill_level?: SkillLevel | null;
  started_training_at?: string | null;
  notes?: string | null;
  invite_email?: string | null;
}

export interface InviteDelivery {
  status: 'sent' | 'skipped' | 'failed';
  notification_id?: string | null;
  external_id?: string | null;
  error?: string | null;
}

export interface StudentCreateResponse extends Student {
  invite_link?: string;
  invite_delivery?: InviteDelivery;
}

export interface ResendInviteResponse {
  invite_link: string;
  delivery: InviteDelivery;
}

export interface StudentUpdateRequest {
  full_name?: string;
  primary_sport?: Sport;
  skill_level?: SkillLevel;
  started_training_at?: string | null;
  notes?: string | null;
}

// ---------- Sessions ----------
export interface Session {
  id: string;
  tenant_id: string;
  student_id: string;
  logged_by_user_id: string;
  session_date: string;
  duration_minutes?: number | null;
  status: SessionStatus;
  voice_transcript?: string | null;
  notes?: string | null;
  coaching_cues?: string | null;
  sparring_rounds_count?: number | null;
  student_self_rating?: number | null;
  raw_input?: Record<string, unknown> | null;
  error_detail?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SessionTechnique {
  id: string;
  session_id: string;
  technique_id: string;
  confidence?: number | null;
  source?: string | null;
}

export interface SessionCreateRequest {
  student_id: string;
  session_date: string; // YYYY-MM-DD
  duration_minutes?: number | null;
  voice_transcript?: string | null;
  notes?: string | null;
  coaching_cues?: string | null;
  sparring_rounds_count?: number | null;
  student_self_rating?: number | null;
  mode?: SessionMode;
  // Calendar linkage — set when logging from a calendar event so the
  // backend marks the source row fulfilled.
  scheduled_session_id?: string | null;
  planned_session_id?: string | null;
  // Skip the AI analysis pipeline. Used for plain check-offs.
  quick_log?: boolean;
}

export interface SessionCreateResponse {
  session_id: string;
  status: SessionStatus;
  estimated_completion_seconds: number;
}

export interface SessionReprocessRequest {
  manual_technique_ids?: string[];
  force_clip_refresh?: boolean;
}

export interface SessionDetailResponse {
  session: Session;
  session_techniques: SessionTechnique[];
  clip_deliveries: ClipDelivery[];
}

// ---------- Clips ----------
export interface ClipDelivery {
  id: string;
  tenant_id: string;
  student_id: string;
  session_id: string;
  fight_id: string;
  technique_id: string;
  delivered_at: string;
  timestamp_start_seconds: number;
  timestamp_end_seconds: number;
  delivery_message: string;
  delivery_channel?: DeliveryChannel | null;
  student_rating?: number | null;
  viewed_duration_seconds?: number | null;
  student_viewed_at?: string | null;
}

export interface FeedItemFight {
  youtube_id: string | null;
  title: string | null;
  event: string | null;
  fighters: (string | null)[];
}

export interface FeedItemTechnique {
  name: string | null;
  display_name: string | null;
}

export interface FeedItem {
  delivery_id: string;
  delivered_at: string | null;
  fight: FeedItemFight;
  technique: FeedItemTechnique;
  timestamp_start_seconds: number | null;
  timestamp_end_seconds: number | null;
  delivery_message: string | null;
  session_reference: string | null;
}

export interface FeedResponse {
  items: FeedItem[];
  next_cursor: string | null;
}

// ---------- Library ----------
export interface Fight {
  id: string;
  youtube_id: string;
  title: string;
  event?: string | null;
  fighter_a: string;
  fighter_b: string;
  fight_year?: number | null;
  sport: Sport;
  duration_seconds?: number | null;
  indexed_at?: string | null;
  indexed_by_user_id?: string | null;
}

export interface FightTechnique {
  id: string;
  fight_id: string;
  technique_id: string;
  timestamp_seconds: number;
  fighter: string;
  notes?: string | null;
  annotator_user_id?: string | null;
  confidence?: number | null;
}

export interface Technique {
  id: string;
  sport: Sport;
  category: string;
  name: string;
  aliases?: string[];
  parent_id?: string | null;
  skill_floor: SkillLevel;
  description?: string | null;
}

export interface LibraryFightCreateRequest {
  youtube_id: string;
  title: string;
  event?: string;
  fighter_a: string;
  fighter_b: string;
  fight_year?: number;
  sport: Sport;
  duration_seconds?: number;
}

export interface LibraryFightTechniqueCreateRequest {
  technique_id: string;
  timestamp_seconds: number;
  fighter: string;
  notes?: string;
  confidence?: number;
}

export interface LibraryTechniqueCreateRequest {
  sport: Sport;
  category: string;
  name: string;
  aliases?: string[];
  parent_id?: string | null;
  skill_floor?: SkillLevel;
  description?: string | null;
}

// ---------- Plans ----------
export interface PlannedSession {
  id: string;
  plan_id: string;
  day_of_week: number; // 0..6
  session_type: SessionType;
  targeted_technique_ids: string[];
  notes?: string | null;
  fulfilled_session_id?: string | null;
  created_at?: string;
}

export interface TrainingPlan {
  id: string;
  tenant_id: string;
  student_id: string;
  week_start: string;
  focus?: string | null;
  status: 'active' | 'completed' | 'archived';
  created_at?: string;
  updated_at?: string;
}

export interface PlanCurrentResponse {
  plan: TrainingPlan | null;
  planned_sessions: PlannedSession[];
}

export interface PlannedSessionInput {
  day_of_week: number;
  session_type: SessionType;
  targeted_technique_ids: string[];
  notes?: string | null;
}

export interface PlanCreateRequest {
  week_start: string;
  focus?: string | null;
  planned_sessions: PlannedSessionInput[];
}

export interface PlanAdjustment {
  id: string;
  tenant_id: string;
  plan_id: string;
  triggered_by_session_id?: string | null;
  proposal: Record<string, unknown>;
  proposed_at: string;
  trainer_acked_at?: string | null;
  trainer_action?: 'accepted' | 'rejected' | 'modified' | null;
  error?: string | null;
}

export interface PlanAdjustmentActionRequest {
  action: 'accept' | 'reject' | 'modify';
  notes?: string;
  modifications?: Record<string, unknown>;
}

// ---------- Dashboard ----------
export interface DashboardSummary {
  active_students_count: number;
  sessions_this_week: number;
  clips_delivered_this_week: number;
  students_at_risk: number;
  pending_session_processing: number;
}

export interface InactivityAlert {
  id: string;
  tenant_id: string;
  student_id: string;
  flagged_at: string;
  reason?: string | null;
  resolved_at?: string | null;
  resolution_note?: string | null;
}

// ---------- Student detail roll-up ----------
export interface StudentDetailResponse {
  student: Student;
  recent_sessions: Session[];
  recent_deliveries: ClipDelivery[];
}

export interface StudentHistoryResponse {
  items: Session[];
  next_cursor: string | null;
}

// ---------- Misc ----------
export interface RatingRequest {
  rating: 1 | 2 | 3 | 4 | 5;
}

export interface ViewedDurationRequest {
  viewed_duration_seconds: number;
}

export interface InactivityResolveRequest {
  resolution_note?: string;
}

export interface CSVImportResult {
  fights_created: number;
  techniques_created: number;
  errors: string[];
}
