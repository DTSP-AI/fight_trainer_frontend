import { apiClient } from '@/lib/api';
import type {
  SessionCreateRequest,
  SessionCreateResponse,
  SessionDetailResponse,
  SessionReprocessRequest,
} from '@/lib/types';

export const sessionsApi = {
  create: (payload: SessionCreateRequest) =>
    apiClient.post<SessionCreateResponse>('/api/sessions', payload),

  get: (sessionId: string) =>
    apiClient.get<SessionDetailResponse>(
      `/api/sessions/${encodeURIComponent(sessionId)}`,
    ),

  reprocess: (sessionId: string, payload: SessionReprocessRequest) =>
    apiClient.post<{ session_id: string; status: string }>(
      `/api/sessions/${encodeURIComponent(sessionId)}/reprocess`,
      payload,
    ),

  /**
   * Manifest M2 — voice mode seam.
   * Backend returns 501 in v1. The VoiceModeBadge component handles this
   * gracefully (toast).
   */
  voiceStream: () => apiClient.post<unknown>('/api/sessions/voice-stream', {}),
};
