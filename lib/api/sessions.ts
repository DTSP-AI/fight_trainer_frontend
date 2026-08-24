import { apiClient } from '@/lib/api';
import type {
  ClipDelivery,
  SessionCreateRequest,
  SessionCreateResponse,
  SessionDetailResponse,
  SessionReprocessRequest,
} from '@/lib/types';

/**
 * GET /api/sessions/{id} joins the library rows onto each delivery
 * (`*, fights(youtube_id, title), techniques(name)`) so the trainer preview
 * can embed the real clip instead of a placeholder. The joins are nullable —
 * a fight or technique row can be deleted out from under a delivery.
 */
export interface ClipDeliveryWithLibrary extends ClipDelivery {
  fights?: { youtube_id: string | null; title: string | null } | null;
  techniques?: { name: string | null } | null;
}

export interface SessionDetailWithLibrary
  extends Omit<SessionDetailResponse, 'clip_deliveries'> {
  clip_deliveries: ClipDeliveryWithLibrary[];
}

export const sessionsApi = {
  create: (payload: SessionCreateRequest) =>
    apiClient.post<SessionCreateResponse>('/api/sessions', payload),

  get: (sessionId: string) =>
    apiClient.get<SessionDetailWithLibrary>(
      `/api/sessions/${encodeURIComponent(sessionId)}`,
    ),

  reprocess: (sessionId: string, payload: SessionReprocessRequest) =>
    apiClient.post<{ session_id: string; status: string }>(
      `/api/sessions/${encodeURIComponent(sessionId)}/reprocess`,
      payload,
    ),

  delete: (sessionId: string) =>
    apiClient.delete<{ deleted: boolean; id: string }>(
      `/api/sessions/${encodeURIComponent(sessionId)}`,
    ),

  /**
   * Manifest M2 — voice mode seam.
   * Backend returns 501 in v1. The VoiceModeBadge component handles this
   * gracefully (toast).
   */
  voiceStream: () => apiClient.post<unknown>('/api/sessions/voice-stream', {}),
};
