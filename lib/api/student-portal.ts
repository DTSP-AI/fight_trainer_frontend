import { apiClient } from '@/lib/api';
import type {
  FeedResponse,
  RatingRequest,
  Session,
  Student,
  ViewedDurationRequest,
} from '@/lib/types';

export const studentPortalApi = {
  me: () => apiClient.get<Student>('/api/student/me'),

  feed: (params?: { limit?: number; cursor?: string }) => {
    const search = new URLSearchParams();
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.cursor) search.set('cursor', params.cursor);
    const qs = search.toString();
    return apiClient.get<FeedResponse>(
      `/api/student/feed${qs ? `?${qs}` : ''}`,
    );
  },

  rate: (deliveryId: string, payload: RatingRequest) =>
    apiClient.post<{ updated: boolean; promotion: unknown }>(
      `/api/student/feed/${encodeURIComponent(deliveryId)}/rate`,
      payload,
    ),

  markViewed: (deliveryId: string, payload: ViewedDurationRequest) =>
    apiClient.patch<{ updated: boolean; promotion: unknown }>(
      `/api/student/feed/${encodeURIComponent(deliveryId)}/viewed`,
      payload,
    ),

  mySessions: (limit = 20) =>
    apiClient.get<Session[]>(`/api/student/sessions?limit=${limit}`),
};
