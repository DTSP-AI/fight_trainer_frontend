import { apiClient } from '@/lib/api';

// Wire shapes mirror backend/app/models/analysis.py
export type AnalysisStatus =
  | 'pending'
  | 'processing'
  | 'verified'
  | 'reported'
  | 'completed'
  | 'failed';

export interface AnalysisListRow {
  id: string;
  status: AnalysisStatus;
  progress_percent: number;
  youtube_url: string;
  youtube_video_id: string | null;
  student_id: string | null;
  current_step?: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface AnalysisFull {
  id: string;
  tenant_id: string;
  requested_by_user_id: string;
  student_id: string | null;
  youtube_url: string;
  youtube_video_id: string | null;
  sport: string | null;
  status: AnalysisStatus;
  // DB column is progress_percent; some places return progress_pct.
  progress_percent: number;
  progress_pct?: number;
  current_step?: string | null;
  error_detail: string | null;
  transcript: string | null;
  verified_fight_data: unknown;
  student_lens: unknown;
  report: unknown; // FightReport JSON (validated client-side via type narrowing)
  validation: unknown;
  fight_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface AnalysisStartedResponse {
  analysis_id: string;
  status: AnalysisStatus;
  progress_percent: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

export const analyzeApi = {
  start: (payload: { youtube_url: string; student_id?: string | null }) =>
    apiClient.post<AnalysisStartedResponse>('/api/analyze', payload),

  list: (params?: { student_id?: string; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.student_id) search.set('student_id', params.student_id);
    if (params?.limit) search.set('limit', String(params.limit));
    const qs = search.toString();
    return apiClient.get<AnalysisListRow[]>(`/api/analyses${qs ? `?${qs}` : ''}`);
  },

  get: (analysisId: string) =>
    apiClient.get<AnalysisFull>(`/api/analysis/${encodeURIComponent(analysisId)}`),

  chat: (analysisId: string, message: string) =>
    apiClient.post<{ message: ChatMessage }>(
      `/api/analysis/${encodeURIComponent(analysisId)}/chat`,
      { message },
    ),

  messages: (analysisId: string) =>
    apiClient.get<ChatMessage[]>(
      `/api/analysis/${encodeURIComponent(analysisId)}/messages`,
    ),
};
