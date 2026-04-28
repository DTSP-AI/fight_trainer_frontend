import { apiClient } from '@/lib/api';
import type {
  ResendInviteResponse,
  Student,
  StudentCreateRequest,
  StudentCreateResponse,
  StudentDetailResponse,
  StudentHistoryResponse,
  StudentUpdateRequest,
} from '@/lib/types';

export const studentsApi = {
  list: () => apiClient.get<Student[]>('/api/students'),

  create: (payload: StudentCreateRequest) =>
    apiClient.post<StudentCreateResponse>('/api/students', payload),

  resendInvite: (studentId: string) =>
    apiClient.post<ResendInviteResponse>(
      `/api/students/${encodeURIComponent(studentId)}/resend-invite`,
      {},
    ),

  get: (studentId: string) =>
    apiClient.get<StudentDetailResponse>(
      `/api/students/${encodeURIComponent(studentId)}`,
    ),

  update: (studentId: string, payload: StudentUpdateRequest) =>
    apiClient.patch<Student>(
      `/api/students/${encodeURIComponent(studentId)}`,
      payload,
    ),

  delete: (studentId: string) =>
    apiClient.delete<{ deleted: boolean; id: string }>(
      `/api/students/${encodeURIComponent(studentId)}`,
    ),

  history: (
    studentId: string,
    params?: { limit?: number; cursor?: string },
  ) => {
    const search = new URLSearchParams();
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.cursor) search.set('cursor', params.cursor);
    const qs = search.toString();
    return apiClient.get<StudentHistoryResponse>(
      `/api/students/${encodeURIComponent(studentId)}/history${qs ? `?${qs}` : ''}`,
    );
  },
};
