'use client';

import type { Session, User } from '@supabase/supabase-js';
import type { UserRole } from '@/lib/types';
import { getSupabaseBrowser } from '@/lib/supabase/client';

/**
 * Auth helpers for the browser. Server Components that need session info
 * should use middleware + lib/supabase/server directly.
 *
 * Roles + tenant_id are stored as Supabase `app_metadata` claims on the
 * user record — these are signed into the JWT and exposed to the FastAPI
 * backend via `user_role` / `tenant_id` / `student_id` claims.
 */

export async function getCurrentSession(): Promise<Session | null> {
  const sb = getSupabaseBrowser();
  const { data } = await sb.auth.getSession();
  return data.session;
}

export async function getCurrentUser(): Promise<User | null> {
  const sb = getSupabaseBrowser();
  const { data } = await sb.auth.getUser();
  return data.user;
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getCurrentSession();
  return session?.access_token ?? null;
}

export function getRoleFromUser(user: User | null): UserRole | null {
  if (!user) return null;
  const meta = (user.app_metadata ?? {}) as Record<string, unknown>;
  const role = meta['user_role'] ?? meta['role'];
  if (
    role === 'trainer' ||
    role === 'student' ||
    role === 'dtsp_admin'
  ) {
    return role;
  }
  return null;
}

export function getTenantIdFromUser(user: User | null): string | null {
  if (!user) return null;
  const meta = (user.app_metadata ?? {}) as Record<string, unknown>;
  const id = meta['tenant_id'];
  return typeof id === 'string' ? id : null;
}

export function getStudentIdFromUser(user: User | null): string | null {
  if (!user) return null;
  const meta = (user.app_metadata ?? {}) as Record<string, unknown>;
  const id = meta['student_id'];
  return typeof id === 'string' ? id : null;
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseBrowser();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const sb = getSupabaseBrowser();
  await sb.auth.signOut();
}

/**
 * Start Supabase Google OAuth. Supabase creates + verifies the identity, then
 * redirects to `redirectTo` (route it through /auth/callback so the PKCE code
 * is exchanged into a cookie session). No password, no magic link.
 */
export async function signInWithGoogle(
  redirectTo: string,
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseBrowser();
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      // Always show Google's account chooser. Without this Google silently
      // reuses whatever account is already signed in — which sends a coach's
      // account into the student claim (→ 409) when a different account was
      // intended. Let the user pick the exact invited address every time.
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Send a password-reset email via Supabase Auth. The link lands the user on
 * `redirectTo` with a recovery session, where they set a new password.
 */
export async function sendPasswordReset(
  email: string,
  redirectTo?: string,
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseBrowser();
  const { error } = await sb.auth.resetPasswordForEmail(
    email,
    redirectTo ? { redirectTo } : undefined,
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Set a new password for the currently-authenticated (or recovery) session. */
export async function updatePassword(
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseBrowser();
  const { error } = await sb.auth.updateUser({ password });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export function rolePathRoot(role: UserRole | null): string {
  switch (role) {
    case 'trainer':
      return '/trainer';
    case 'student':
      return '/student';
    case 'dtsp_admin':
      return '/dtsp-admin';
    default:
      return '/auth/login';
  }
}
