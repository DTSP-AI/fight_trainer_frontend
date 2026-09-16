'use client';

import { useCallback, useEffect, useState } from 'react';
import { PackageOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { billingApi } from '@/lib/api/billing';
import { packageOffersApi, type PackageOfferRow } from '@/lib/api/package-offers';
import { ApiClientError, describeApiError } from '@/lib/api';

function fmtCents(c: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(c / 100);
}

/**
 * The client-side CTA for a package offer. Renders on every student page
 * while an offer is open; accepting creates the package and hands off to
 * Stripe Checkout. If online payment is not configured the package is still
 * activated and the client settles with their coach.
 */
export function PackageOfferCta({ onChanged }: { onChanged?: () => void } = {}) {
  const [offer, setOffer] = useState<PackageOfferRow | null>(null);
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);

  const load = useCallback(async () => {
    try {
      const rows = await packageOffersApi.mine();
      setOffer(rows.find((o) => o.status === 'sent') ?? null);
    } catch {
      /* endpoint unavailable — stay silent, never block the portal */
    }
  }, []);

  useEffect(() => {
    // Wrapped so the loader's setState calls land in a promise callback
    // rather than synchronously in the effect body.
    void (async () => {
      await load();
    })();
  }, [load]);

  async function accept() {
    if (!offer) return;
    setBusy('accept');
    try {
      const res = await packageOffersApi.accept(offer.id);
      setOffer(null);
      onChanged?.();
      try {
        const checkout = await billingApi.startPackageCheckout(res.package.id);
        window.location.assign(checkout.checkout_url);
        return;
      } catch (err) {
        const code = err instanceof ApiClientError ? err.code : undefined;
        if (code === 'STRIPE_NOT_CONFIGURED') {
          toast.success('Package added — settle up with your coach');
        } else {
          toast.success('Package added');
          toast.error(`Online payment failed: ${describeApiError(err)}`);
        }
      }
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setBusy(null);
    }
  }

  async function decline() {
    if (!offer) return;
    setBusy('decline');
    try {
      await packageOffersApi.decline(offer.id);
      setOffer(null);
      onChanged?.();
      toast.success('No problem — your coach has been told');
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setBusy(null);
    }
  }

  if (!offer) return null;

  return (
    <div className="mb-4 rounded-md border border-primary/40 bg-primary/10 p-4 text-sm">
      <div className="flex items-start gap-3">
        <PackageOpen className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-medium">Your coach sent you your next package</p>
          <p>
            <span className="text-base font-semibold">
              {offer.total_sessions} sessions
              {offer.service_name ? ` · ${offer.service_name}` : ''}
            </span>
            <span className="text-muted-foreground">
              {' '}
              · {fmtCents(offer.price_per_session_cents)} each · {fmtCents(offer.total_price_cents)} total
            </span>
          </p>
          {offer.message ? (
            <p className="italic text-muted-foreground">&ldquo;{offer.message}&rdquo;</p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button size="sm" disabled={busy !== null} onClick={() => void accept()}>
              {busy === 'accept' ? 'Working…' : 'Accept & pay'}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => void decline()}>
              Not now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
