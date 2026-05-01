import { getAccessToken } from '@/lib/auth';
import type { ApiError, ApiResponse } from '@/lib/types';

/**
 * Base fetch wrapper for the FastAPI backend.
 *
 * Reads the Supabase access_token from the session and attaches it as
 * `Authorization: Bearer ...`. Unwraps the standard response envelope:
 *
 *     success → { data: T, error: null }
 *     failure → { data: null, error: { code, message, request_id? } }
 *
 * Throws ApiClientError on transport failures or envelope errors so callers
 * can render toasts + error UI without re-checking shapes.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export class ApiClientError extends Error {
  code: string;
  status: number;
  requestId?: string | undefined;

  constructor(
    message: string,
    code: string,
    status: number,
    requestId?: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /**
   * If true, attach Authorization header even though the route is auth-gated.
   * Defaults to true. Set false for /auth/* public routes.
   */
  authed?: boolean;
  /**
   * Force a specific tag on the request (Next.js fetch cache). Defaults to
   * `no-store` for mutating verbs.
   */
  cache?: RequestInit['cache'];
  /**
   * For multipart uploads — caller supplies a FormData body and we don't
   * stringify or set Content-Type.
   */
  formData?: FormData;
}

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  };

  if (options.authed !== false) {
    const token = await getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined && options.body !== null) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body,
      cache: options.cache ?? 'no-store',
      credentials: 'include',
    });
  } catch (err) {
    throw new ApiClientError(
      err instanceof Error
        ? `Network error: ${err.message}`
        : 'Network error',
      'NETWORK_ERROR',
      0,
    );
  }

  // Empty body? (204, etc.)
  let json: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      throw new ApiClientError(
        `Invalid JSON from ${path}`,
        'INVALID_JSON',
        res.status,
      );
    }
  }

  if (!res.ok) {
    const err = (json as { error?: ApiError } | null)?.error;
    const detail = (json as { detail?: ApiError } | null)?.detail;
    const code =
      err?.code ??
      detail?.code ??
      (res.status === 401 ? 'AUTH_REQUIRED' : 'HTTP_ERROR');
    const message =
      err?.message ??
      detail?.message ??
      `Request failed with status ${res.status}`;
    const requestId = err?.request_id ?? detail?.request_id ?? undefined;
    throw new ApiClientError(message, code, res.status, requestId ?? undefined);
  }

  // Standard envelope unwrap.
  const envelope = json as ApiResponse<T> | null;
  if (envelope && typeof envelope === 'object' && 'data' in envelope) {
    if (envelope.error) {
      throw new ApiClientError(
        envelope.error.message,
        envelope.error.code,
        res.status,
        envelope.error.request_id ?? undefined,
      );
    }
    return envelope.data as T;
  }

  // Non-enveloped responses (rare — health checks).
  return (json as T) ?? (undefined as unknown as T);
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, { ...(options ?? {}), body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, { ...(options ?? {}), body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, { ...(options ?? {}), body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>('DELETE', path, options),
  upload: <T>(path: string, formData: FormData, options?: RequestOptions) =>
    request<T>('POST', path, { ...(options ?? {}), formData }),
} as const;

/** Map an API error code to a user-facing toast message. */
export function describeApiError(err: unknown): string {
  if (err instanceof ApiClientError) {
    switch (err.code) {
      case 'AUTH_REQUIRED':
        return 'Your session has expired. Please sign in again.';
      case 'TENANT_MISMATCH':
        return "You don't have access to this resource.";
      case 'STUDENT_NOT_FOUND':
        return 'Student not found.';
      case 'SESSION_PROCESSING_FAILED':
        return 'Pipeline error processing the session. You can retry.';
      case 'CLIP_RETRIEVAL_EMPTY':
        return 'No matching clips found in the library yet.';
      case 'INVALID_TECHNIQUE_ID':
        return 'That technique is not in the library taxonomy.';
      case 'RATE_LIMITED':
        return 'Too many requests — slow down for a minute.';
      case 'NOT_IMPLEMENTED':
        return err.message;
      case 'NETWORK_ERROR':
        return 'Network error — check your connection.';
      default:
        return err.message;
    }
  }
  return err instanceof Error ? err.message : 'Something went wrong.';
}
