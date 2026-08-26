'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getCurrentUser,
  getRoleFromUser,
  rolePathRoot,
  signInWithGoogle,
  signInWithPassword,
} from '@/lib/auth';
import { BRAND } from '@/lib/brand';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next');
  const reason = params.get('reason');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error('Email and password required');
      return;
    }
    setSubmitting(true);
    const res = await signInWithPassword(email.trim(), password);
    if (!res.ok) {
      toast.error(res.error ?? 'Sign-in failed');
      setSubmitting(false);
      return;
    }
    // Resolve role from the just-issued JWT and route to the right surface.
    const user = await getCurrentUser();
    const role = getRoleFromUser(user);
    const dest = next || rolePathRoot(role);
    router.replace(dest);
  }

  async function onGoogle() {
    // Students sign in with Google. Route through /auth/callback so the OAuth
    // code becomes a session, then land on /auth/student/accept which runs the
    // idempotent claim: already-bound → straight to /student; first visit with
    // a pending invite → binds, then /student.
    const origin = window.location.origin;
    const nextPath = encodeURIComponent('/auth/student/accept');
    const res = await signInWithGoogle(
      `${origin}/auth/callback?next=${nextPath}`,
    );
    if (!res.ok) toast.error(res.error ?? 'Could not start Google sign-in.');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Sign in</CardTitle>
      </CardHeader>
      <CardContent>
        {reason === 'role_mismatch' ? (
          <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Your account doesn&apos;t have access to that area.
          </p>
        ) : null}
        {reason === 'supabase_not_configured' ? (
          <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Auth is not configured. Contact your administrator.
          </p>
        ) : null}

        <form className="space-y-4" onSubmit={onPasswordSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@gym.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={submitting}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
            {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
          </Button>
          <p className="text-center text-sm">
            <Link
              href="/auth/forgot"
              className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Forgot password?
            </Link>
          </p>
          <p className="text-center text-sm">
            New here?{' '}
            <Link
              href="/auth/signup"
              className="text-foreground underline underline-offset-4"
            >
              Create an account
            </Link>
          </p>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            or
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          size="lg"
          onClick={onGoogle}
        >
          Continue with Google
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Students sign in with the Google account their coach invited.
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{BRAND.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Coaching infrastructure for combat sport.
        </p>
      </div>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </>
  );
}
