import { apiClient } from '@/lib/api';
import type {
  DashboardSummary,
  InactivityAlert,
  InactivityResolveRequest,
} from '@/lib/types';

export const dashboardApi = {
  summary: () => apiClient.get<DashboardSummary>('/api/dashboard/summary'),

  inactivityAlerts: () =>
    apiClient.get<InactivityAlert[]>('/api/dashboard/inactivity-alerts'),

  resolveAlert: (alertId: string, payload: InactivityResolveRequest) =>
    apiClient.post<InactivityAlert>(
      `/api/dashboard/inactivity-alerts/${encodeURIComponent(alertId)}/resolve`,
      payload,
    ),
};
