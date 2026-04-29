import { apiClient } from '@/lib/api';

export type NoteKind =
  | 'session_notes'
  | 'coaching_cues'
  | 'voice_transcript'
  | 'student_notes'
  | 'service_description'
  | 'package_notes'
  | 'schedule_notes'
  | 'payment_instructions'
  | 'plan_focus'
  | 'generic';

export interface AssistRequest {
  kind?: NoteKind;
  draft: string;
  student_id?: string | null;
  instruction?: string;
}

export interface AssistResponse {
  suggestion: string;
  used_context_count: number;
}

export const aiAssistApi = {
  note: (payload: AssistRequest) =>
    apiClient.post<AssistResponse>('/api/ai-assist/note', payload),
};
