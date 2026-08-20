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
import { authApi } from '@/lib/api/auth';
import { describeApiError } from '@/lib/api';
import { BRAND } from '@/lib/brand';

/**
 * CLIENT signup — the primary path. A client joins with an invite code from
 * their coach and sets their own password. (If they clicked the invite LINK
 * their coach sent, they land on /auth/student/accept-invite directly; this
 * page is for entering a code by hand.) Coach setup lives on a separate page.
 */
function ClientSignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [inviteCode, setInviteCode] = useState(params.get('token') ?? '');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteCode.trim() || !fullName.trim()) {
      toast.error('Invite code and your name are required');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSubmitting(true);
    try {
      await authApi.acceptStudentInvite({
        invite_token: inviteCode.trim(),
        full_name: fullName.trim(),
        password,
      });
      toast.success('Account created — sign in with your email and password');
      router.replace('/auth/login');
    } catch (err) {
      toast.error(describeApiError(err));
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
        <p className="mb-4 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          Clients join with an invite from their coach. Paste the invite code
          (or open the link your coach sent). No invite yet? Ask your coach to
          add you.
        </p>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="invite_code">Invite code</Label>
            <Input
              id="invite_code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client_name">Your name</Label>
            <Input
              id="client_name"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client_password">Create a password</Label>
            <Input
              id="client_password"
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
            {submitting ? 'Creating…' : 'Create account'}
            {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm">
          Already have an account?{' '}
          <Link
            href="/auth/login"
            className="text-foreground underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function SignupPage() {
  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{BRAND.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your client account.
        </p>
      </div>
      <Suspense fallback={null}>
        <ClientSignupForm />
      </Suspense>
      {/* Subtle coach entry — separate page, out of the client's way. */}
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Are you a coach?{' '}
        <Link
          href="/auth/signup/coach"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Set up your gym
        </Link>
      </p>
    </>
  );
}
