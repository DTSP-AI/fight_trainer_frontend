'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { updatePassword } from '@/lib/auth';
import { BRAND } from '@/lib/brand';

export default function ResetPasswordPage() {
  const router = useRouter();
  // 'checking' → verifying the recovery session; 'ready' → show form;
  // 'invalid' → no recovery session (bad/expired link).
  const [phase, setPhase] = useState<'checking' | 'ready' | 'invalid'>(
    'checking',
  );
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const sb = getSupabaseBrowser();
    let settled = false;

    // The recovery link carries a token that @supabase/ssr exchanges for a
    // recovery session on load; enable the form once that session exists.
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      if (session) {
        settled = true;
        setPhase('ready');
      }
    });
    sb.auth.getSession().then(({ data }) => {
      if (data.session) {
        settled = true;
        setPhase('ready');
      }
    });
    // Give the URL exchange a moment; if no session materializes, the link is bad.
    const t = setTimeout(() => {
      if (!settled) setPhase('invalid');
    }, 2500);

    return () => {
      clearTimeout(t);
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSubmitting(true);
    const res = await updatePassword(password);
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error ?? 'Could not update password');
      return;
    }
    toast.success('Password updated — sign in with your new password');
    router.replace('/auth/login');
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{BRAND.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set a new password.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Reset password</CardTitle>
        </CardHeader>
        <CardContent>
          {phase === 'checking' && (
            <p className="text-sm text-muted-foreground">Verifying link…</p>
          )}
          {phase === 'invalid' && (
            <div className="space-y-3">
              <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                This reset link is invalid or has expired.
              </p>
              <Link
                href="/auth/forgot"
                className="text-sm text-foreground underline underline-offset-4"
              >
                Request a new link
              </Link>
            </div>
          )}
          {phase === 'ready' && (
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <p className="text-xs text-muted-foreground">
                  At least 8 characters.
                </p>
              </div>
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={submitting}
              >
                {submitting ? 'Updating…' : 'Update password'}
                {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </>
  );
}
