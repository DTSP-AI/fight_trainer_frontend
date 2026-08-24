'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { describeApiError } from '@/lib/api';
import { pushApi, pushSupported, urlBase64ToUint8Array } from '@/lib/api/push';

type PushState = 'unsupported' | 'disabled' | 'loading' | 'off' | 'on';

/**
 * Opt-in toggle for Web Push notifications. Works for trainer + student —
 * the backend keys the subscription off the caller's identity.
 *
 * iOS note: Safari only delivers web push to a PWA installed to the home
 * screen. We surface that instead of failing silently.
 */
export function PushToggle() {
  const [state, setState] = useState<PushState>('loading');

  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!pushSupported()) {
        setState('unsupported');
        return;
      }
      try {
        const { enabled } = await pushApi.publicKey();
        if (cancelled) return;
        if (!enabled) {
          setState('disabled');
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setState(sub ? 'on' : 'off');
      } catch {
        if (!cancelled) setState('disabled');
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = useCallback(async () => {
    setState('loading');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Notifications blocked — enable them in your browser settings.');
        setState('off');
        return;
      }
      const { public_key: publicKey } = await pushApi.publicKey();
      if (!publicKey) throw new Error('push not configured');
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
      await pushApi.subscribe(sub.toJSON(), navigator.userAgent);
      setState('on');
      toast.success('Notifications on');
      pushApi.sendTest().catch(() => undefined);
    } catch (err) {
      toast.error(describeApiError(err));
      setState('off');
    }
  }, []);

  const disable = useCallback(async () => {
    setState('loading');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await pushApi.unsubscribe(sub.endpoint).catch(() => undefined);
        await sub.unsubscribe();
      }
      setState('off');
      toast.success('Notifications off');
    } catch (err) {
      toast.error(describeApiError(err));
      setState('on');
    }
  }, []);

  if (state === 'unsupported') {
    return (
      <p className="text-sm text-muted-foreground">
        This browser doesn&apos;t support push notifications. On iPhone, add the app
        to your home screen first (Share → Add to Home Screen).
      </p>
    );
  }
  if (state === 'disabled') {
    return (
      <p className="text-sm text-muted-foreground">
        Push notifications aren&apos;t configured on the server yet.
      </p>
    );
  }

  return (
    <Button
      type="button"
      variant={state === 'on' ? 'outline' : 'default'}
      disabled={state === 'loading'}
      onClick={state === 'on' ? disable : enable}
    >
      {state === 'on' ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
      {state === 'loading'
        ? 'Working…'
        : state === 'on'
          ? 'Turn off notifications'
          : 'Turn on notifications'}
    </Button>
  );
}
