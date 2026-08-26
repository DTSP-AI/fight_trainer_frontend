'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/api/auth';
import { describeApiError } from '@/lib/api';
import { getCurrentSession, signInWithGoogle } from '@/lib/auth';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { BRAND } from '@/lib/brand';

type Phase = 'checking' | 'need_auth' | 'binding' | 'success' | 'error';

/**
 * Student invite acceptance — Supabase-native, no password, no magic link.
 *
 *   1. Student clicks "Continue with Google" → Supabase OAuth verifies their
 *      email and establishes a session (via /auth/callback).
 *   2. Back here with a session, we call /auth/student/claim, which binds the
 *      verified email to the roster row the coach created and stamps their
 *      student claims.
 *   3. We refresh the session so the JWT carries the new claims, then land
 *      them in the student portal.
 */
function AcceptInvite() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('checking');
  const [message, setMessage] = useState('');
  const bound = useRef(false);

  async function bind() {
    if (bound.current) return;
    bound.current = true;
    setPhase('binding');
    try {
      const sb = getSupabaseBrowser();
      await authApi.claimStudent();
      // Claims were just stamped server-side — refresh so the session JWT
      // carries user_role/tenant_id/student_id before entering the portal.
      await sb.auth.refreshSession();
      setPhase('success');
      setTimeout(() => router.replace('/student'), 900);
    } catch (err) {
      bound.current = false;
      // Log so the reason survives even if the UI re-renders fast.
      console.error('[student/accept] claim failed:', err);
      setPhase('error');
      setMessage(describeApiError(err));
    }
  }

  useEffect(() => {
    let cancelled = false;
    getCurrentSession().then((session) => {
      if (cancelled) return;
      if (session) void bind();
      else setPhase('need_auth');
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onGoogle() {
    // Route through the callback so the PKCE code becomes a cookie session,
    // then return here (now authenticated) to complete the bind.
    const origin = window.location.origin;
    const next = encodeURIComponent('/auth/student/accept');
    const redirectTo = `${origin}/auth/callback?next=${next}`;
    const res = await signInWithGoogle(redirectTo);
    if (!res.ok) {
      setPhase('error');
      setMessage(res.error ?? 'Could not start Google sign-in.');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Join your coach</CardTitle>
      </CardHeader>
      <CardContent>
        {phase === 'checking' && (
          <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Checking your session…</span>
          </div>
        )}

        {phase === 'need_auth' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sign in with the Google account for the email your coach invited.
              We&apos;ll connect you to your training — no password needed.
            </p>
            <Button className="w-full" size="lg" onClick={onGoogle}>
              Continue with Google
            </Button>
          </div>
        )}

        {phase === 'binding' && (
          <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Connecting you to your coach…</span>
          </div>
        )}

        {phase === 'success' && (
          <div className="flex items-center gap-3 py-4 text-sm text-foreground">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span>You&apos;re in. Taking you to your training…</span>
          </div>
        )}

        {phase === 'error' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{message}</span>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setMessage('');
                setPhase('need_auth');
              }}
            >
              Try again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AcceptInvitePage() {
  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{BRAND.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You&apos;ve been invited by your coach.
        </p>
      </div>
      <Suspense fallback={null}>
        <AcceptInvite />
      </Suspense>
    </>
  );
}
