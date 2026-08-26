import { apiClient } from '@/lib/api';
import type {
  TrainerSignupRequest,
  TrainerSignupResponse,
} from '@/lib/types';

export const authApi = {
  trainerSignup: (payload: TrainerSignupRequest) =>
    apiClient.post<TrainerSignupResponse>('/auth/trainer/signup', payload, {
      authed: false,
    }),

  /**
   * Bind an OAuth-authenticated student to their pending roster row. The
   * student is ALREADY signed in via Supabase Google OAuth (email ownership
   * proven) — `authed: true` attaches that JWT. The backend matches the
   * verified email to the invite and stamps the student's claims. Idempotent.
   * No password, no token, no magic link.
   */
  claimStudent: () =>
    apiClient.post<{
      claimed: boolean;
      student_id: string;
      tenant_id: string;
    }>('/auth/student/claim', {}, { authed: true }),
};
