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

  /**
   * Complete the connection: atomically consume THIS trainer's pending
   * server-side claim (bound to their tenant+user at /start). No token is
   * carried from the browser — the backend finds the claim by identity.
   */
  googleOAuthClaim: () =>
    apiClient.post<{ connected: boolean; google_email: string | null }>(
      '/api/integrations/google/oauth/claim',
    ),

  googleDisconnect: () =>
    apiClient.post<{ disconnected: boolean }>('/api/integrations/google/disconnect'),
} as const;
