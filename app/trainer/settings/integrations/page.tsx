'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar, ExternalLink, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/common/loading-state';
import { PushToggle } from '@/components/common/push-toggle';
import { describeApiError } from '@/lib/api';
import { integrationsApi, type IntegrationsStatus } from '@/lib/api/integrations';

const GCAL_CALLBACK_TOASTS: Record<string, { ok: boolean; msg: string }> = {
  denied: { ok: false, msg: 'Google sign-in was cancelled or denied' },
  state_invalid: { ok: false, msg: 'Connection link expired — try again' },
  exchange_failed: { ok: false, msg: 'Google token exchange failed — try again' },
  encrypt_failed: { ok: false, msg: 'Server encryption not configured (FERNET_KEY)' },
  db_unavailable: { ok: false, msg: 'Database unavailable — try again shortly' },
};

export default function TrainerIntegrationsPage() {
  // useSearchParams requires a Suspense boundary during prerender.
  return (
    <Suspense fallback={<LoadingState />}>
      <IntegrationsContent />
    </Suspense>
  );
}

function IntegrationsContent() {
  const [status, setStatus] = useState<IntegrationsStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const searchParams = useSearchParams();

  const refresh = useCallback(() => {
    integrationsApi
      .status()
      .then(setStatus)
      .catch((err) => setError(describeApiError(err)));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Handle the OAuth callback outcome exactly once. On `gcal=pending` the
  // backend already stored a server-side, single-use claim bound to this
  // trainer; we complete the connection by calling claim WITH NO TOKEN — the
  // backend finds it by our authenticated identity. Nothing redeemable is in
  // the URL.
  useEffect(() => {
    const outcome = searchParams.get('gcal');
    if (!outcome) return;
    window.history.replaceState(null, '', '/trainer/settings/integrations');

    if (outcome === 'pending') {
      integrationsApi
        .googleOAuthClaim()
        .then(({ google_email: email }) => {
          toast.success(
            email ? `Google Calendar connected as ${email}` : 'Google Calendar connected',
          );
          refresh();
        })
        .catch((err) => toast.error(describeApiError(err)));
      return;
    }
    const t = GCAL_CALLBACK_TOASTS[outcome];
    if (t) (t.ok ? toast.success : toast.error)(t.msg);
  }, [searchParams, refresh]);

  async function onConnect() {
    setBusy(true);
    try {
      const { auth_url: authUrl } = await integrationsApi.googleOAuthStart();
      window.location.assign(authUrl);
    } catch (err) {
      toast.error(describeApiError(err));
      setBusy(false);
    }
  }

  async function onDisconnect() {
    setBusy(true);
    try {
      await integrationsApi.googleDisconnect();
      toast.success('Google Calendar disconnected');
      refresh();
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        {error}
      </p>
    );
  }
  if (!status) return <LoadingState />;

  const connected = status.google_calendar_connected;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Integrations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Calendar sync and device notifications for your studio.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" /> Google Calendar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {connected ? (
            <>
              <p className="text-sm">
                Connected — sessions you schedule, reschedule, or cancel are
                mirrored to{' '}
                <span className="font-medium">
                  {status.google_calendar_id === 'primary'
                    ? 'your primary calendar'
                    : status.google_calendar_id}
                </span>
                .
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={onDisconnect}
              >
                <Unplug className="h-4 w-4" />
                {busy ? 'Working…' : 'Disconnect'}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Connect your Google account and every scheduled session lands on
                your calendar automatically — reschedules and cancellations
                included.
              </p>
              <Button type="button" disabled={busy} onClick={onConnect}>
                <ExternalLink className="h-4 w-4" />
                {busy ? 'Opening Google…' : 'Connect Google Calendar'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notifications on this device</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Get booking and reminder alerts on this device even when the app is
            closed.
          </p>
          <PushToggle />
        </CardContent>
      </Card>
    </div>
  );
}
