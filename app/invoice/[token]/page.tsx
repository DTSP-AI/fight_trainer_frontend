'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Check, Copy, CreditCard, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/common/loading-state';
import { billingApi, type InvoicePublicPayload } from '@/lib/api/billing';
import { ApiClientError, describeApiError } from '@/lib/api';

function formatCents(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function PublicInvoicePage() {
  // useSearchParams requires a Suspense boundary during prerender.
  return (
    <Suspense fallback={<LoadingState label="Loading invoice…" />}>
      <PublicInvoiceContent />
    </Suspense>
  );
}

function PublicInvoiceContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = String(params?.token ?? '');
  const [data, setData] = useState<InvoicePublicPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Set when the backend reports Stripe isn't configured — hides the CTA so
  // the student is left with the Venmo/Zelle options that DO work.
  const [stripeUnavailable, setStripeUnavailable] = useState(false);
  const [payBusy, setPayBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    billingApi
      .getPublicInvoice(token)
      .then(setData)
      .catch((err) => setError(describeApiError(err)));
  }, [token]);

  // Stripe sends the student back to ?paid=1 after a successful checkout.
  // The webhook settles the balance asynchronously — toast immediately, then
  // refetch a couple of times so the on-screen balance catches up.
  useEffect(() => {
    if (searchParams.get('paid') !== '1' || !token) return;
    toast.success('Payment received — thanks!', {
      description: 'Your coach sees it on their end within a minute.',
    });
    const timers = [2500, 8000].map((ms) =>
      setTimeout(() => {
        billingApi.getPublicInvoice(token).then(setData).catch(() => undefined);
      }, ms),
    );
    return () => timers.forEach(clearTimeout);
  }, [searchParams, token]);

  async function payOnline() {
    setPayBusy(true);
    try {
      const res = await billingApi.startPublicInvoiceCheckout(token);
      window.location.assign(res.checkout_url);
    } catch (err) {
      if (
        err instanceof ApiClientError &&
        (err.code === 'STRIPE_NOT_CONFIGURED' || err.status === 503)
      ) {
        setStripeUnavailable(true);
        toast('Online payment isn’t enabled', {
          description: 'Use one of the payment options below instead.',
        });
      } else {
        toast.error(describeApiError(err));
      }
      setPayBusy(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md p-6">
        <Card>
          <CardContent className="space-y-3 py-10 text-center">
            <h1 className="text-xl font-semibold">Invoice not found</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
            <p className="text-xs text-muted-foreground">
              Ask your coach to resend the link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (!data) return <LoadingState label="Loading invoice…" />;

  const inv = data.invoice;
  const due = formatCents(inv.amount_due_cents, inv.currency);
  const paid = inv.amount_paid_cents > 0;
  const isPaid = inv.status === 'paid' || inv.amount_due_cents === 0;
  const venmo = data.payment_methods.venmo;
  const zelle = data.payment_methods.zelle;
  const canPayOnline =
    inv.status !== 'paid' &&
    inv.status !== 'cancelled' &&
    inv.amount_due_cents > 0 &&
    !stripeUnavailable;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="mx-auto max-w-2xl space-y-6 px-4">
        {/* Header */}
        <div className="text-center">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {data.trainer.tenant_name ?? 'Fight Trainer'}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {data.student.name ? `Hi ${data.student.name.split(' ')[0]},` : 'Hi,'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.trainer.tenant_name ?? 'Your coach'} sent you an invoice.
          </p>
        </div>

        {/* Amount */}
        <Card className="surface-3d-card glow-ring">
          <CardContent className="space-y-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">{inv.description}</p>
            <p className="text-5xl font-semibold tracking-tight">
              {due}
            </p>
            {paid && !isPaid ? (
              <p className="text-xs text-muted-foreground">
                {formatCents(inv.amount_paid_cents, inv.currency)} already paid
              </p>
            ) : null}
            {isPaid ? (
              <Badge>Paid in full</Badge>
            ) : (
              <Badge variant="secondary" className="capitalize">
                {inv.status}
              </Badge>
            )}
            {inv.due_date ? (
              <p className="text-xs text-muted-foreground">
                Due by {formatDate(inv.due_date)}
              </p>
            ) : null}
          </CardContent>
        </Card>

        {/* Payment instructions */}
        {!isPaid && data.trainer.payment_instructions ? (
          <p className="rounded-md border border-border bg-card/60 p-4 text-sm text-muted-foreground">
            {data.trainer.payment_instructions}
          </p>
        ) : null}

        {/* Card / online payment — the fastest path, so it leads. */}
        {canPayOnline ? (
          <Card>
            <CardContent className="space-y-3 py-5">
              <div className="flex items-baseline justify-between">
                <p className="text-base font-semibold">Pay by card</p>
                <span className="text-xs text-muted-foreground">
                  Secure checkout
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Pay {due} now — settles instantly, no follow-up needed.
              </p>
              <Button
                size="lg"
                className="btn-3d-primary w-full"
                disabled={payBusy}
                onClick={payOnline}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {payBusy ? 'Opening checkout…' : 'Pay online'}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {/* Payment buttons */}
        {!isPaid && venmo ? (
          <Card>
            <CardContent className="space-y-3 py-5">
              <div className="flex items-baseline justify-between">
                <p className="text-base font-semibold">Venmo</p>
                <span className="text-xs text-muted-foreground">
                  @{venmo.handle}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Tap to open Venmo with the amount + note prefilled.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button asChild size="lg" className="btn-3d-primary">
                  <a href={venmo.app_url}>Open Venmo app</a>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href={venmo.web_url} target="_blank" rel="noreferrer">
                    Venmo website
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {!isPaid && zelle ? (
          <Card>
            <CardContent className="space-y-3 py-5">
              <div className="flex items-baseline justify-between">
                <p className="text-base font-semibold">Zelle</p>
                <span className="text-xs text-muted-foreground">
                  {zelle.display_name ?? 'Send to'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Open your bank's Zelle, send <strong>{due}</strong> to the
                number below.
              </p>
              {zelle.phone ? (
                <ZelleCopyRow value={zelle.phone} label="Phone" />
              ) : null}
              {zelle.email ? (
                <ZelleCopyRow value={zelle.email} label="Email" />
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          After you send payment, your coach confirms it in the app.
          {!isPaid && inv.invoice_number ? (
            <>
              <br />
              Invoice #{inv.invoice_number}
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}

function ZelleCopyRow({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/60 px-3 py-2">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="font-mono text-base">{value}</div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            toast.success(`Copied ${label.toLowerCase()}`);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            toast.error('Could not copy — long-press to copy manually');
          }
        }}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}
