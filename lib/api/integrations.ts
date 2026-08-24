import { apiClient } from '@/lib/api';

// ============================================================================
// Integrations — Stripe status + Google Calendar OAuth
// ============================================================================

export interface IntegrationsStatus {
  stripe_connected: boolean;
  stripe_account_mode: string | null;
  stripe_publishable_key: string | null;
  google_calendar_connected: boolean;
  google_calendar_id: string | null;
  google_calendar_scopes: string[];
}

export const integrationsApi = {
  status: () => apiClient.get<IntegrationsStatus>('/api/integrations/status'),

  /** Returns the Google authorization URL to open in a new tab. */
  googleOAuthStart: () =>
    apiClient.post<{ auth_url: string }>('/api/integrations/google/oauth/start'),

  googleDisconnect: () =>
    apiClient.post<{ disconnected: boolean }>('/api/integrations/google/disconnect'),
} as const;
