'use client';

import { useState } from 'react';
import Link from 'next/link';
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

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [fullName, setFullName] = useState('');
  const [sport, setSport] = useState<Sport | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !tenantName.trim() || !fullName.trim() || !sport) {
      toast.error('All fields are required');
      return;
    }
    setSubmitting(true);
    try {
      await authApi.trainerSignup({
        email: email.trim(),
        full_name: fullName.trim(),
        tenant_name: tenantName.trim(),
        primary_sport: sport,
      });
      setDone(true);
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
          Start your pilot
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {BRAND.name} for your gym. First 30 days free.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Coach signup</CardTitle>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="space-y-3">
              <p className="text-sm">
                We sent a magic link to{' '}
                <span className="font-semibold">{email}</span>. Click it to
                finish setup — your gym tenant is being provisioned.
              </p>
              <p className="text-xs text-muted-foreground">
                Already verified?{' '}
                <Link
                  href="/auth/login"
                  className="underline underline-offset-4"
                >
                  Sign in here
                </Link>
                .
              </p>
            </div>
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
                {submitting ? 'Creating…' : 'Create account'}
                {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
              </Button>
              <p className="text-center text-sm">
                Already have an account?{' '}
                <Link
                  href="/auth/login"
                  className="text-foreground underline underline-offset-4"
                >
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </>
  );
}
