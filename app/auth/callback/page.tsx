'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase/client';

/**
 * Supabase OAuth callback handler (Google sign-in).
 *
 * Handles both response shapes Supabase can return:
 *   - PKCE (the flow we use): redirect lands with `?code=...`.
 *     Client calls `exchangeCodeForSession(code)` → sets session cookies.
 *   - Implicit (hash) fallback: `#access_token=...&refresh_token=...` fragment,
 *     which `createBrowserClient` auto-detects. Kept only as a defensive
 *     fallback — no magic-link flow uses this anymore.
 *
 * Either way, after the session is in cookies, we navigate to `?next=`.
 *
 * This page MUST run client-side (the URL hash never reaches the server).
 */
function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/';
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sb = getSupabaseBrowser();

    const code = params.get('code');
    const errParam = params.get('error_description') || params.get('error');

    if (errParam) {
      setError(errParam);
      router.replace(
        `/auth/login?reason=callback_error&detail=${encodeURIComponent(errParam)}`,
      );
      return;
    }

    if (code) {
      sb.auth
        .exchangeCodeForSession(code)
        .then(({ error: exchangeError }) => {
          if (exchangeError) {
            setError(exchangeError.message);
            router.replace(
              `/auth/login?reason=exchange_failed&detail=${encodeURIComponent(exchangeError.message)}`,
            );
          } else {
            router.replace(next);
          }
        })
        .catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : 'unknown';
          setError(msg);
          router.replace(`/auth/login?reason=exchange_threw&detail=${encodeURIComponent(msg)}`);
        });
      return;
    }

    // Hash-fragment flow: createBrowserClient auto-handles it on page load.
    // Poll briefly until session is detected, then route.
    let attempts = 0;
    const poll = setInterval(async () => {
      attempts += 1;
      const { data } = await sb.auth.getSession();
      if (data.session) {
        clearInterval(poll);
        router.replace(next);
      } else if (attempts > 20) {
        clearInterval(poll);
        setError('No session after 4s of polling');
        router.replace('/auth/login?reason=no_session');
      }
    }, 200);

    return () => clearInterval(poll);
  }, [params, next, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="text-center">
        <p className="text-base text-foreground">Signing you in…</p>
        {error ? (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Verifying your session.
          </p>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackInner />
    </Suspense>
  );
}
