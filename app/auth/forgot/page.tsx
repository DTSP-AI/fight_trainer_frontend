'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { sendPasswordReset } from '@/lib/auth';
import { BRAND } from '@/lib/brand';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Email required');
      return;
    }
    setSubmitting(true);
    const redirect =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/reset-password`
        : undefined;
    const res = await sendPasswordReset(email.trim(), redirect);
    setSubmitting(false);
    // Always show the same confirmation — don't reveal whether an email exists.
    if (!res.ok) {
      toast.error(res.error ?? 'Could not send reset email');
      return;
    }
    setSent(true);
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{BRAND.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reset your password.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Forgot password</CardTitle>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-3">
              <p className="text-sm">
                If an account exists for{' '}
                <span className="font-semibold">{email}</span>, a reset link is
                on its way. Check your email and follow the link to set a new
                password.
              </p>
              <Link
                href="/auth/login"
                className="text-sm text-foreground underline underline-offset-4"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
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
                {submitting ? 'Sending…' : 'Send reset link'}
                {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
              </Button>
              <p className="text-center text-sm">
                <Link
                  href="/auth/login"
                  className="text-foreground underline underline-offset-4"
                >
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </>
  );
}
