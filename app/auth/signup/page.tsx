'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { authApi } from '@/lib/api/auth';
import { describeApiError } from '@/lib/api';
import { BRAND } from '@/lib/brand';
import type { Sport } from '@/lib/types';

const SPORT_OPTIONS: { value: Sport; label: string }[] = [
  { value: 'bjj', label: 'Brazilian Jiu-Jitsu' },
  { value: 'mma', label: 'MMA' },
  { value: 'muay_thai', label: 'Muay Thai' },
  { value: 'boxing', label: 'Boxing' },
  { value: 'wrestling', label: 'Wrestling' },
  { value: 'kickboxing', label: 'Kickboxing' },
];

// Account types. 'fighter' is architected-for-later — shown disabled so the
// UX + routing already accounts for it without wiring its flow yet.
type AccountType = 'coach' | 'client';

export default function SignupPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<AccountType>('coach');
  const [submitting, setSubmitting] = useState(false);

  // Coach fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [fullName, setFullName] = useState('');
  const [sport, setSport] = useState<Sport | ''>('');

  // Client fields
  const [inviteCode, setInviteCode] = useState('');

  async function onCoachSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !tenantName.trim() || !fullName.trim() || !sport) {
      toast.error('All fields are required');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSubmitting(true);
    try {
      await authApi.trainerSignup({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        tenant_name: tenantName.trim(),
        primary_sport: sport,
      });
      toast.success('Account created — sign in with your email and password');
      router.replace('/auth/login');
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function onClientSubmit(e: React.FormEvent) {
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
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Get started
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {BRAND.name} — pick your account type.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Create account</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Account-type toggle (Fighter = coming soon, architected-for-later) */}
          <div className="mb-6 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setAccountType('coach')}
              className={`rounded-md border px-3 py-2 text-sm transition ${
                accountType === 'coach'
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              Coach
            </button>
            <button
              type="button"
              onClick={() => setAccountType('client')}
              className={`rounded-md border px-3 py-2 text-sm transition ${
                accountType === 'client'
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              Client
            </button>
            <button
              type="button"
              disabled
              title="Coming soon"
              className="cursor-not-allowed rounded-md border border-border px-3 py-2 text-sm text-muted-foreground/50"
            >
              Fighter
            </button>
          </div>

          {accountType === 'coach' ? (
            <form className="space-y-4" onSubmit={onCoachSubmit}>
              <div className="space-y-2">
                <Label htmlFor="full_name">Your name</Label>
                <Input
                  id="full_name"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenant_name">Gym / studio name</Label>
                <Input
                  id="tenant_name"
                  autoComplete="organization"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  required
                />
              </div>
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
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
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
              <div className="space-y-2">
                <Label htmlFor="primary_sport">Primary sport</Label>
                <Select
                  value={sport || undefined}
                  onValueChange={(v) => setSport(v as Sport)}
                >
                  <SelectTrigger id="primary_sport">
                    <SelectValue placeholder="Select your sport" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={submitting}
              >
                {submitting ? 'Creating…' : 'Create coach account'}
                {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={onClientSubmit}>
              <p className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                Clients join through an invite from their coach. Paste the invite
                code (or open the invite link your coach sent). No invite? Ask
                your coach to add you.
              </p>
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
                {submitting ? 'Creating…' : 'Create client account'}
                {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
              </Button>
            </form>
          )}

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
    </>
  );
}
