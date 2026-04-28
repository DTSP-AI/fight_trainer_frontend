'use client';

import { useState, Suspense } from 'react';
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

function AcceptInviteForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      toast.error('Invite token missing — check the link your coach sent.');
      return;
    }
    if (!fullName.trim()) {
      toast.error('Your name is required');
      return;
    }
    setSubmitting(true);
    try {
      await authApi.acceptStudentInvite({
        invite_token: token,
        full_name: fullName.trim(),
      });
      toast.success('Invite accepted — check email for sign-in link');
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
        {!token ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            This invite link is missing its token. Ask your coach to resend.
          </p>
        ) : (
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="full_name">Your name</Label>
              <Input
                id="full_name"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                This is how your coach sees you in their roster.
              </p>
            </div>
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={submitting}
            >
              {submitting ? 'Accepting…' : 'Accept invite'}
              {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>
          </form>
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
        <AcceptInviteForm />
      </Suspense>
    </>
  );
}
