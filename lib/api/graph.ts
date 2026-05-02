import { apiClient } from '@/lib/api';

export interface GraphNode {
  id: string;
  name: string;
  sport?: string;
  discipline_class?: string;
  canonical_position?: string;
  stats?: {
    analysis_mention_count: number;
    distinct_tenant_count: number;
    last_mentioned_at?: string | null;
  };
}

export type EdgeKind = 'sets_up' | 'counters' | 'follows_from' | 'chains_to';

export type Initiative = 'lead' | 'sim_counter' | 'delayed_counter' | 'feint';

export interface GraphEdge {
  id: string;
  from_technique_id: string;
  to_technique_id: string;
  kind: EdgeKind;
  weight: number;
  contribution_count: number;
  sport?: string | null;
  last_contributed_at?: string | null;
  primary_initiative?: Initiative | null;
  initiative_distribution?: Partial<Record<Initiative, number>>;
}

export interface StudentOverlay {
  drilled_ids: string[];
  focus_ids: string[];
}

export interface RecentContributions {
  new_edges: number;
  reinforced_edges: number;
  mentions: number;
}

export const graphApi = {
  techniques: (params?: { sport?: string; q?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.sport) qs.set('sport', params.sport);
    if (params?.q) qs.set('q', params.q);
    if (params?.limit) qs.set('limit', String(params.limit));
    const tail = qs.toString();
    return apiClient.get<GraphNode[]>(
      `/api/graph/techniques${tail ? `?${tail}` : ''}`,
    );
  },
  edges: (params?: {
    sport?: string;
    kind?: EdgeKind;
    initiative?: Initiative;
    min_weight?: number;
    limit?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.sport) qs.set('sport', params.sport);
    if (params?.kind) qs.set('kind', params.kind);
    if (params?.initiative) qs.set('initiative', params.initiative);
    if (params?.min_weight != null)
      qs.set('min_weight', String(params.min_weight));
    if (params?.limit) qs.set('limit', String(params.limit));
    const tail = qs.toString();
    return apiClient.get<GraphEdge[]>(
      `/api/graph/edges${tail ? `?${tail}` : ''}`,
    );
  },
  studentOverlay: (studentId: string) =>
    apiClient.get<StudentOverlay>(
      `/api/graph/student/${encodeURIComponent(studentId)}`,
    ),
  recent: (windowDays = 7) =>
    apiClient.get<RecentContributions>(
      `/api/graph/recent-contributions?window_days=${windowDays}`,
    ),
  deleteEdge: (edgeId: string) =>
    apiClient.delete<{ deleted: boolean; id: string }>(
      `/api/graph/edges/${encodeURIComponent(edgeId)}`,
    ),
};
