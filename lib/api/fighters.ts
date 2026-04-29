import { apiClient } from '@/lib/api';

export interface FighterRow {
  id: string;
  name: string;
  nickname?: string | null;
  discipline?: string | null;
  weight_class?: string | null;
  current_events_summary?: string | null;
  last_searched_at?: string | null;
  created_at?: string | null;
  // Detail-only:
  bio?: string | null;
  record?: Record<string, number> | null;
  metadata?: Record<string, unknown> | null;
  updated_at?: string | null;
}

export interface FighterAnalysisLink {
  role?: string | null;
  created_at?: string | null;
  fight_analyses?: {
    id: string;
    status?: string;
    youtube_url?: string | null;
    completed_at?: string | null;
    verified_fight_data?: {
      fighter_a?: string | null;
      fighter_b?: string | null;
      winner?: string | null;
      method?: string | null;
      event?: string | null;
      fight_year?: number | null;
    } | null;
  } | null;
}

export interface FighterDetailResponse {
  fighter: FighterRow;
  analyses: FighterAnalysisLink[];
}

export interface FighterMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface FighterChatResponse {
  user: FighterMessage;
  assistant: FighterMessage;
}

export const fightersApi = {
  list: (params?: { discipline?: string; q?: string }) => {
    const qs = new URLSearchParams();
    if (params?.discipline) qs.set('discipline', params.discipline);
    if (params?.q) qs.set('q', params.q);
    const tail = qs.toString();
    return apiClient.get<FighterRow[]>(
      `/api/fighters${tail ? `?${tail}` : ''}`,
    );
  },
  get: (fighterId: string) =>
    apiClient.get<FighterDetailResponse>(
      `/api/fighters/${encodeURIComponent(fighterId)}`,
    ),
  refresh: (fighterId: string, force = true) =>
    apiClient.post<{
      current_events_summary: string | null;
      fighter_id: string;
    }>(
      `/api/fighters/${encodeURIComponent(fighterId)}/refresh?force=${force}`,
      {},
    ),
  delete: (fighterId: string) =>
    apiClient.delete<{ deleted: boolean; id: string }>(
      `/api/fighters/${encodeURIComponent(fighterId)}`,
    ),
  messages: (fighterId: string) =>
    apiClient.get<FighterMessage[]>(
      `/api/fighters/${encodeURIComponent(fighterId)}/messages`,
    ),
  chat: (fighterId: string, message: string) =>
    apiClient.post<FighterChatResponse>(
      `/api/fighters/${encodeURIComponent(fighterId)}/chat`,
      { message },
    ),
};
