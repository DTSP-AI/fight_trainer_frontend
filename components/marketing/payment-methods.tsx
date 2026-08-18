'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  VENMO_HANDLE,
  ZELLE_NUMBER_RAW,
  ZELLE_NUMBER_DISPLAY,
} from '@/lib/payments';

/**
 * Payment methods strip for the pricing page.
 *
 * Venmo is a true deep link — on a phone it opens the Venmo app on the
 * recipient's profile. Zelle has no public deep-link/prefill URL (it lives
 * inside each bank's own app), so we surface the number with a one-tap copy
 * and instructions instead of a link that cannot work.
 */

const VENMO_PROFILE_URL = `https://venmo.com/u/${VENMO_HANDLE}`;

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (insecure context / permissions) — no-op;
      // the number is visible on screen to copy manually.
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={onCopy} aria-label={label}>
      {copied ? (
        <>
          <Check className="h-4 w-4" /> Copied
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" /> Copy
        </>
      )}
    </Button>
  );
}

export function PaymentMethods() {
  return (
    <section className="mx-auto mt-16 max-w-3xl">
      <div className="text-center">
        <h2 className="text-xl font-semibold tracking-tight">
          Ready to pay?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tap your tier above to pay by Venmo with the amount pre-filled, or use
          a method below. Add your name and package in the payment note.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {/* Venmo */}
        <div className="flex flex-col rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Venmo
            </span>
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight">
            @{VENMO_HANDLE}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Opens the Venmo app on your phone.
          </p>
          <div className="mt-4 flex gap-2">
            <Button asChild size="sm">
              <a href={VENMO_PROFILE_URL} rel="noopener noreferrer">
                Pay on Venmo
              </a>
            </Button>
            <CopyButton value={`@${VENMO_HANDLE}`} label="Copy Venmo handle" />
          </div>
        </div>

        {/* Zelle */}
        <div className="flex flex-col rounded-lg border border-border bg-card p-6">
          <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Zelle
          </span>
          <p className="mt-2 text-2xl font-semibold tracking-tight">
            {ZELLE_NUMBER_DISPLAY}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Send from your bank&apos;s app to this number.
          </p>
          <div className="mt-4 flex gap-2">
            <CopyButton value={ZELLE_NUMBER_RAW} label="Copy Zelle number" />
          </div>
        </div>
      </div>
    </section>
  );
}
