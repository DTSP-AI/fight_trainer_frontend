import { apiClient } from '@/lib/api';
import type {
  PlanAdjustment,
  PlanAdjustmentActionRequest,
  PlanCreateRequest,
  PlanCurrentResponse,
} from '@/lib/types';

/**
 * GET /api/plan-adjustments joins the plan + student onto each proposal so the
 * trainer panel can render a row standalone. Both joins are nullable — the
 * parent plan can be deleted while a proposal is still pending.
 */
export interface PlanAdjustmentWithPlan extends PlanAdjustment {
  training_plans?: {
    id: string;
    week_start: string;
    focus: string | null;
    student_id: string;
    students?: { id: string; full_name: string } | null;
  } | null;
}

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

  listAdjustments: (params?: { pending_only?: boolean; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.pending_only !== undefined) {
      search.set('pending_only', String(params.pending_only));
    }
    if (params?.limit !== undefined) search.set('limit', String(params.limit));
    const qs = search.toString();
    return apiClient.get<PlanAdjustmentWithPlan[]>(
      `/api/plan-adjustments${qs ? `?${qs}` : ''}`,
    );
  },

  ackAdjustment: (
    adjustmentId: string,
    payload: PlanAdjustmentActionRequest,
  ) =>
    apiClient.patch<{ adjustment_id: string; action: string }>(
      `/api/plan-adjustments/${encodeURIComponent(adjustmentId)}`,
      payload,
    ),

  delete: (planId: string) =>
    apiClient.delete<{ deleted: boolean; id: string }>(
      `/api/training-plans/${encodeURIComponent(planId)}`,
    ),

  deletePlannedSession: (plannedId: string) =>
    apiClient.delete<{ deleted: boolean; id: string }>(
      `/api/planned-sessions/${encodeURIComponent(plannedId)}`,
    ),
};
