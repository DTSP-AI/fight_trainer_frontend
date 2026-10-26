'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PromotionCheckoutError, startPromotionCheckout } from '@/lib/api/promotions';

const LIMIT_MESSAGE: Record<string, string> = {
  PROMOTION_LIMIT_REACHED: 'This email has already used its limit for this promotion.',
  PROMOTION_UNAVAILABLE: 'This promotion is no longer available.',
  PROMOTION_NOT_FOUND: 'This promotion is no longer available.',
};

export function PromotionCheckout({
  slug,
  status,
  cancelled,
}: {
  slug: string;
  status: 'live' | 'sold_out' | 'unavailable';
  cancelled: boolean;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status !== 'live') {
    return (
      <p className="mt-6 text-sm text-muted-foreground">
        {status === 'sold_out' ? 'This promotion is sold out.' : 'This promotion is not available right now.'}
      </p>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !phone.trim() || !email.trim()) {
      setError('Name, phone and email are all required.');
      return;
    }
    setBusy(true);
    try {
      const { checkout_url } = await startPromotionCheckout(slug, {
        email: email.trim(),
        name: name.trim(),
        phone: phone.trim(),
      });
      window.location.assign(checkout_url);
    } catch (err) {
      const code = err instanceof PromotionCheckoutError ? err.code : 'CHECKOUT_FAILED';
      setError(LIMIT_MESSAGE[code] ?? (err instanceof Error ? err.message : 'Could not start checkout.'));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      {cancelled ? (
        <p className="text-sm text-muted-foreground">Checkout was cancelled. You can try again below.</p>
      ) : null}
      <div className="space-y-1">
        <Label htmlFor="promo-name">Name</Label>
        <Input id="promo-name" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="promo-phone">Phone</Label>
        <Input
          id="promo-phone"
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
          inputMode="tel"
        />
        <p className="text-xs text-muted-foreground">Your coach will text or call to set up your first session.</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="promo-email">Email</Label>
        <Input
          id="promo-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <p className="text-xs text-muted-foreground">
          Your sessions and sign-in link go to this address.
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : 'Buy now'}
      </Button>
    </form>
  );
}
