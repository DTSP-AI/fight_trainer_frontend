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
  signInWithPassword,
  signInWithMagicLink,
} from '@/lib/auth';
import { BRAND } from '@/lib/brand';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next');
  const reason = params.get('reason');

  const [mode, setMode] = useState<'password' | 'magic'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

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

  async function onMagicSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Email required');
      return;
    }
    setSubmitting(true);
    const redirect =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next ?? '/')}`
        : undefined;
    const res = await signInWithMagicLink(email.trim(), redirect);
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error ?? 'Could not send link');
      return;
    }
    setMagicSent(true);
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
        {reason === 'callback_error' || reason === 'exchange_failed' ? (
          <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Sign-in link failed. Try password sign-in below.
          </p>
        ) : null}

        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setMode('password')}
            className={`flex-1 rounded-md border px-3 py-1.5 text-sm transition ${
              mode === 'password'
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => setMode('magic')}
            className={`flex-1 rounded-md border px-3 py-1.5 text-sm transition ${
              mode === 'magic'
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            Magic link
          </button>
        </div>

        {mode === 'password' ? (
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
              New here?{' '}
              <Link
                href="/auth/signup"
                className="text-foreground underline underline-offset-4"
              >
                Create an account
              </Link>
            </p>
          </form>
        ) : magicSent ? (
          <div className="space-y-3">
            <p className="text-sm">
              Check <span className="font-semibold">{email}</span> — we sent a
              one-tap sign-in link.
            </p>
            <button
              type="button"
              className="text-xs text-muted-foreground underline underline-offset-4"
              onClick={() => setMagicSent(false)}
            >
              Try again
            </button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={onMagicSubmit}>
            <div className="space-y-2">
              <Label htmlFor="magic_email">Email</Label>
              <Input
                id="magic_email"
                type="email"
                autoComplete="email"
                placeholder="you@gym.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={submitting}
            >
              {submitting ? 'Sending…' : 'Send magic link'}
              {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>
          </form>
        )}
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
