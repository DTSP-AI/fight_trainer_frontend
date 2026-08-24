import { apiClient } from '@/lib/api';

// ============================================================================
// Web Push — subscription lifecycle against /api/push/*
// ============================================================================

export interface PushKeyResponse {
  public_key: string | null;
  enabled: boolean;
}

export const pushApi = {
  publicKey: () => apiClient.get<PushKeyResponse>('/api/push/public-key'),

  subscribe: (sub: PushSubscriptionJSON, userAgent?: string) =>
    apiClient.post<{ id: string; subscribed: boolean }>('/api/push/subscribe', {
      endpoint: sub.endpoint,
      keys: sub.keys,
      user_agent: userAgent,
    }),

  unsubscribe: (endpoint: string) =>
    apiClient.post<{ unsubscribed: boolean }>('/api/push/unsubscribe', { endpoint }),

  sendTest: () => apiClient.post<{ delivered: number }>('/api/push/test'),
} as const;

/** Base64url → Uint8Array for PushManager.subscribe applicationServerKey. */
export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}
