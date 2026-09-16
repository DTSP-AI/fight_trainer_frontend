'use client';

import { useState } from 'react';
import { Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { packageOffersApi, type PackageOfferRow } from '@/lib/api/package-offers';
import { describeApiError } from '@/lib/api';
import { fmtCents } from './ledger-row-actions';

const STATUS_VARIANT: Record<PackageOfferRow['status'], 'default' | 'secondary' | 'outline'> = {
  sent: 'default',
  accepted: 'outline',
  declined: 'secondary',
  cancelled: 'secondary',
};

const STATUS_LABEL: Record<PackageOfferRow['status'], string> = {
  sent: 'Awaiting reply',
  accepted: 'Accepted',
  declined: 'Declined',
  cancelled: 'Withdrawn',
};

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

/** Offer history for one client on the Billing tab, with withdraw + resend. */
export function PackageOffersPanel({
  offers,
  onSendNew,
  onChanged,
}: {
  offers: PackageOfferRow[];
  onSendNew: () => void;
  onChanged: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function withdraw(id: string) {
    setBusyId(id);
    try {
      await packageOffersApi.cancel(id);
      toast.success('Offer withdrawn');
      onChanged();
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Package offers</CardTitle>
        <Button size="sm" variant="outline" onClick={onSendNew}>
          <Send className="h-4 w-4" />
          Send offer
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {offers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing sent yet. When a package runs low, send the next one from here or the
            &ldquo;Needs you&rdquo; card.
          </p>
        ) : (
          offers.map((o) => (
            <div
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card/60 p-3"
            >
              <div className="min-w-0 flex-1 text-sm">
                <div className="font-semibold">
                  {o.service_name ?? 'Package'} · {o.total_sessions} sessions @{' '}
                  {fmtCents(o.price_per_session_cents)} = {fmtCents(o.total_price_cents)}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant={STATUS_VARIANT[o.status]}>{STATUS_LABEL[o.status]}</Badge>
                  <span>sent {fmtDate(o.sent_at)}</span>
                  {o.responded_at ? <span>· replied {fmtDate(o.responded_at)}</span> : null}
                </div>
                {o.message ? (
                  <p className="mt-1 text-xs italic text-muted-foreground">{o.message}</p>
                ) : null}
              </div>
              {o.status === 'sent' ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busyId === o.id}
                  onClick={() => void withdraw(o.id)}
                >
                  <X className="h-4 w-4" />
                  Withdraw
                </Button>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
