import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * Supabase OAuth callback — SERVER route handler (Google sign-in, PKCE).
 *
 * Must run on the server: signInWithOAuth (client) stores the PKCE
 * code_verifier in a cookie, and the exchange has to read that cookie
 * server-side. Doing the exchange client-side fails with "PKCE code verifier
 * not found in storage" — which is exactly what we hit. A route handler (not
 * a Server Component) can write the resulting session cookies onto the response.
 *
 * The exchange client sees ONLY the PKCE verifier cookie, never the caller's
 * existing session cookies. auth-js awaits initialization before it reads the
 * verifier, and initialization loads whatever session cookie is present; if
 * that (old, chunked, just-refreshed) cookie fails to parse as a valid session
 * it calls _removeSession(), which also deletes the code-verifier key, and the
 * SSR cookie adapter masks that deletion for the rest of the request. Result:
 * "PKCE code verifier not found in storage" even though the browser sent it.
 * Verified in @supabase/auth-js 2.105.1 GoTrueClient (_recoverAndRefresh ->
 * _removeSession) and @supabase/ssr 0.5.2 createServerClient (removedItems).
 * This route mints a NEW session, so the old one is dead weight here.
 *
 * After a successful exchange we redirect to `?next=` (the student accept page,
 * which runs the idempotent claim). On failure we bounce to /auth/login with a
 * readable reason+detail so it never fails silently.
 */

const VERIFIER_SUFFIX = '-code-verifier';
const SESSION_MARKER = '-auth-token';

async function getExchangeClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase env not configured: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.',
    );
  }
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore
          .getAll()
          .filter((c) => c.name.endsWith(VERIFIER_SUFFIX));
      },
      setAll(
        cookiesToSet: { name: string; value: string; options?: CookieOptions }[],
      ) {
        const written = new Set(cookiesToSet.map((c) => c.name));
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
        // The adapter only knows the cookies we exposed, so it cannot clear
        // stale session chunks itself. Expire any old chunk the new session
        // did not overwrite (e.g. a leftover `.2` when the new token is
        // shorter), or the next reassembly is corrupt again.
        cookieStore
          .getAll()
          .filter(
            (c) =>
              c.name.includes(SESSION_MARKER) &&
              !c.name.endsWith(VERIFIER_SUFFIX) &&
              !written.has(c.name),
          )
          .forEach((c) => cookieStore.set(c.name, '', { path: '/', maxAge: 0 }));
      },
    },
  });
}
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

  let roleDest: string | null = null;
  try {
    const supabase = await getExchangeClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return loginRedirect('exchange_failed', error.message);
    }
    // Route by the signed role claim. Google is not student-only: a trainer
    // (or admin) who signs in with Google must land in their own portal, not
    // on the student claim page, which rejects non-student accounts.
    //
    // Students ALWAYS continue to `next` (the accept page). Its claim call is
    // idempotent and is the only thing that binds the roster row to the auth
    // user. Legacy accounts can carry student claims while their roster row is
    // still unbound — skipping the claim for them leaves the coach seeing
    // "pending" forever.
    const meta = (data.session?.user.app_metadata ?? {}) as Record<
      string,
      unknown
    >;
    const role = meta['user_role'] ?? meta['role'];
    if (role === 'trainer') roleDest = '/trainer';
    else if (role === 'dtsp_admin') roleDest = '/dtsp-admin';
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    return loginRedirect('exchange_threw', msg);
  }

  // Session cookies are set on the response. A user with a role claim goes to
  // their portal; a user with no claims yet (first-time student) continues to
  // `next`, which is the accept page that binds them.
  const target = roleDest ?? (next.startsWith('/') ? next : '/');
  return NextResponse.redirect(`${origin}${target}`);
}
