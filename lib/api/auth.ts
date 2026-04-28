import { apiClient } from '@/lib/api';
import type {
  StudentInviteAcceptRequest,
  TrainerSignupRequest,
  TrainerSignupResponse,
} from '@/lib/types';

export const authApi = {
  trainerSignup: (payload: TrainerSignupRequest) =>
    apiClient.post<TrainerSignupResponse>('/auth/trainer/signup', payload, {
      authed: false,
    }),

  acceptStudentInvite: (payload: StudentInviteAcceptRequest) =>
    apiClient.post<{ accepted: boolean }>(
      '/auth/student/accept-invite',
      payload,
      { authed: false },
    ),
};
