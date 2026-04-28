import { apiClient } from '@/lib/api';
import type {
  PlanAdjustmentActionRequest,
  PlanCreateRequest,
  PlanCurrentResponse,
} from '@/lib/types';

export const plansApi = {
  current: (studentId: string) =>
    apiClient.get<PlanCurrentResponse>(
      `/api/students/${encodeURIComponent(studentId)}/plan/current`,
    ),

  create: (studentId: string, payload: PlanCreateRequest) =>
    apiClient.post<PlanCurrentResponse>(
      `/api/students/${encodeURIComponent(studentId)}/plan`,
      payload,
    ),

  ackAdjustment: (
    adjustmentId: string,
    payload: PlanAdjustmentActionRequest,
  ) =>
    apiClient.patch<{ adjustment_id: string; action: string }>(
      `/api/plan-adjustments/${encodeURIComponent(adjustmentId)}`,
      payload,
    ),
};
