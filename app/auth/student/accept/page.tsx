'use client';

import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, AlertCircle, MailCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi } from '@/lib/api/auth';
import { describeApiError } from '@/lib/api';
import {
  getCurrentSession,
  signInWithGoogle,
  signInWithPassword,
  signOut,
  signUpWithPassword,
} from '@/lib/auth';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { BRAND } from '@/lib/brand';

type Phase =
  | 'checking'
  | 'need_auth'
  | 'confirm_sent'
  | 'binding'
  | 'success'
  | 'error';

type EmailMode = 'create' | 'signin';

const MIN_PASSWORD = 8;

/**
 * Student invite acceptance — Supabase-native, no invite tokens, no magic link.
 *
 * Two ways to prove you own the invited email:
 *   a. "Continue with Google" → Supabase OAuth (verified email, no password).
 *   b. Email + password → Supabase sends a confirmation link; the confirmed
 *      session carries `email_verified`. For clients without a Google account.
 *
 * Either way the session comes back here through /auth/callback, and we call
 * /auth/student/claim, which binds the verified email to the roster row the
 * coach created and stamps the student claims. Then we refresh the session so
 * the JWT carries them and land in the student portal.
 */
function AcceptInvite() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('checking');
  const [message, setMessage] = useState('');
  const bound = useRef(false);

  const [emailMode, setEmailMode] = useState<EmailMode>('create');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const bind = useCallback(async () => {
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
  }, [router]);

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
  }, [bind]);

  function callbackRedirect(): string {
    // Route through the callback so the PKCE code becomes a cookie session,
    // then return here (now authenticated) to complete the bind.
    const origin = window.location.origin;
    const next = encodeURIComponent('/auth/student/accept');
    return `${origin}/auth/callback?next=${next}`;
  }

  async function onGoogle() {
    const res = await signInWithGoogle(callbackRedirect());
    if (!res.ok) {
      setPhase('error');
      setMessage(res.error ?? 'Could not start Google sign-in.');
    }
  }

  async function onEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    const addr = email.trim().toLowerCase();
    if (!addr || !password) {
      setMessage('Email and password are required.');
      return;
    }
    if (emailMode === 'create' && password.length < MIN_PASSWORD) {
      setMessage(`Use at least ${MIN_PASSWORD} characters.`);
      return;
    }
    setMessage('');
    setSubmitting(true);
    try {
      if (emailMode === 'signin') {
        const res = await signInWithPassword(addr, password);
        if (!res.ok) {
          setMessage(res.error ?? 'Sign-in failed.');
          return;
        }
        await bind();
        return;
      }
      const res = await signUpWithPassword(addr, password, callbackRedirect());
      if (!res.ok) {
        setMessage(res.error ?? 'Could not create your account.');
        return;
      }
      if (res.existing) {
        setEmailMode('signin');
        setMessage('That email already has an account — sign in with your password.');
        return;
      }
      if (res.confirmed) {
        await bind();
        return;
      }
      setPhase('confirm_sent');
    } finally {
      setSubmitting(false);
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
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Use the email address your coach invited. Fastest is Google —
                no password to remember.
              </p>
              <Button className="w-full" size="lg" onClick={onGoogle}>
                Continue with Google
              </Button>
            </div>

            <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={onEmailSubmit} className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {emailMode === 'create'
                  ? 'No Google account? Create a password for the invited email. We’ll send a confirmation link.'
                  : 'Sign in with the password you created for the invited email.'}
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="accept-email">Email</Label>
                <Input
                  id="accept-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="accept-password">Password</Label>
                <Input
                  id="accept-password"
                  type="password"
                  autoComplete={emailMode === 'create' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={emailMode === 'create' ? `At least ${MIN_PASSWORD} characters` : ''}
                  required
                />
              </div>
              {message && (
                <p className="text-xs text-destructive">{message}</p>
              )}
              <Button
                type="submit"
                variant="outline"
                className="w-full"
                size="lg"
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : emailMode === 'create' ? (
                  'Create password & continue'
                ) : (
                  'Sign in & continue'
                )}
              </Button>
              <button
                type="button"
                className="w-full text-center text-xs text-muted-foreground underline underline-offset-4"
                onClick={() => {
                  setMessage('');
                  setEmailMode(emailMode === 'create' ? 'signin' : 'create');
                }}
              >
                {emailMode === 'create'
                  ? 'Already created a password? Sign in'
                  : 'First time here? Create a password'}
              </button>
            </form>
          </div>
        )}

        {phase === 'confirm_sent' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 py-2 text-sm text-foreground">
              <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              <span>
                Check your inbox at <strong>{email.trim()}</strong> and click
                the confirmation link. It brings you straight back here and
                connects you to your coach.
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Nothing after a few minutes? Check spam, then try again from
              this page.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setPassword('');
                setPhase('need_auth');
              }}
            >
              Back
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
            <p className="text-xs text-muted-foreground">
              If you signed in with the wrong account, sign out and try again
              with the exact email your coach invited.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                // Signed in with the wrong account → clear the session so the
                // next attempt uses a different identity (a plain retry would
                // re-run the claim with the same one and fail again).
                await signOut();
                setMessage('');
                setPhase('need_auth');
              }}
            >
              Sign out &amp; use a different account
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
