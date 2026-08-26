'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BRAND } from '@/lib/brand';

/**
 * CLIENT signup — Supabase-native. Clients don't create passwords or enter
 * codes: their coach adds them by email, they open the invite link, and sign
 * in with Google. This page points them to that flow. Coach setup is separate.
 */
function ClientSignupCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Join your coach</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          Clients join by invite. Your coach adds you by email, then you sign in
          with Google — no password to create. Open the invite link your coach
          emailed, or continue below with the same email address.
        </p>
        <Button asChild className="w-full" size="lg">
          <Link href="/auth/student/accept">Continue with Google</Link>
        </Button>
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
          Join your coach on {BRAND.name}.
        </p>
      </div>
      <ClientSignupCard />
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
