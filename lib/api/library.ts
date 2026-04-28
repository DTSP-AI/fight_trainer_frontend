import { apiClient } from '@/lib/api';
import type { Fight, FightTechnique, Sport, Technique } from '@/lib/types';

export const libraryApi = {
  techniques: (params?: {
    sport?: Sport;
    category?: string;
    parent_id?: string;
    limit?: number;
  }) => {
    const search = new URLSearchParams();
    if (params?.sport) search.set('sport', params.sport);
    if (params?.category) search.set('category', params.category);
    if (params?.parent_id) search.set('parent_id', params.parent_id);
    if (params?.limit) search.set('limit', String(params.limit));
    const qs = search.toString();
    return apiClient.get<Technique[]>(
      `/api/library/techniques${qs ? `?${qs}` : ''}`,
    );
  },

  fightDetail: (fightId: string) =>
    apiClient.get<{ fight: Fight; techniques: FightTechnique[] }>(
      `/api/library/fights/${encodeURIComponent(fightId)}`,
    ),
};
