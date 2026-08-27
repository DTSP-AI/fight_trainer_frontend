import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

/**
 * Supabase OAuth callback — SERVER route handler (Google sign-in, PKCE).
 *
 * Must run on the server: signInWithOAuth (client) stores the PKCE
 * code_verifier in a cookie, and the exchange has to read that cookie
 * server-side. Doing the exchange client-side fails with "PKCE code verifier
 * not found in storage" — which is exactly what we hit. `getSupabaseServer()`
 * reads the request cookies and, in a route handler (not a Server Component),
 * can write the resulting session cookies onto the response.
 *
 * After a successful exchange we redirect to `?next=` (the student accept page,
 * which runs the idempotent claim). On failure we bounce to /auth/login with a
 * readable reason+detail so it never fails silently.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/';
  const oauthError =
    url.searchParams.get('error_description') || url.searchParams.get('error');

  // Vercel sits behind a proxy; honor the forwarded host so the redirect lands
  // on the public origin, not the internal one.
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const origin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : url.origin;

  const loginRedirect = (reason: string, detail?: string) => {
    const dest = new URL('/auth/login', origin);
    dest.searchParams.set('reason', reason);
    if (detail) dest.searchParams.set('detail', detail);
    return NextResponse.redirect(dest);
  };

  if (oauthError) {
    return loginRedirect('callback_error', oauthError);
  }
  if (!code) {
    return loginRedirect('no_code', 'no authorization code on the callback');
  }

  try {
    const supabase = await getSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return loginRedirect('exchange_failed', error.message);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    return loginRedirect('exchange_threw', msg);
  }

  // Session cookies are set on the response; land on the intended next page.
  const dest = next.startsWith('/') ? `${origin}${next}` : `${origin}/`;
  return NextResponse.redirect(dest);
}
