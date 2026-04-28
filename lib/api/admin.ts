import { apiClient } from '@/lib/api';
import type {
  CSVImportResult,
  Fight,
  FightTechnique,
  LibraryFightCreateRequest,
  LibraryFightTechniqueCreateRequest,
  LibraryTechniqueCreateRequest,
  Technique,
} from '@/lib/types';

export const adminApi = {
  addFight: (payload: LibraryFightCreateRequest) =>
    apiClient.post<Fight>('/api/admin/library/fights', payload),

  annotateFight: (
    fightId: string,
    payload: LibraryFightTechniqueCreateRequest,
  ) =>
    apiClient.post<FightTechnique>(
      `/api/admin/library/fights/${encodeURIComponent(fightId)}/techniques`,
      payload,
    ),

  importCSV: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.upload<CSVImportResult>(
      '/api/admin/library/fights/import-csv',
      fd,
    );
  },

  addTechnique: (payload: LibraryTechniqueCreateRequest) =>
    apiClient.post<Technique>('/api/admin/library/techniques', payload),

  oembed: (youtubeId: string) =>
    apiClient.post<Record<string, unknown>>(
      `/api/admin/library/oembed/${encodeURIComponent(youtubeId)}`,
      {},
    ),
};
