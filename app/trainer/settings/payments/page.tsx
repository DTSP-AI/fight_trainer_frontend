'use client';

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoadingState } from '@/components/common/loading-state';
import { billingApi, type TenantSettings } from '@/lib/api/billing';
import { describeApiError } from '@/lib/api';

export default function TrainerPaymentSettingsPage() {
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [venmoHandle, setVenmoHandle] = useState('');
  const [venmoDisplayName, setVenmoDisplayName] = useState('');
  const [zellePhone, setZellePhone] = useState('');
  const [zelleEmail, setZelleEmail] = useState('');
  const [zelleDisplayName, setZelleDisplayName] = useState('');
  const [paymentInstructions, setPaymentInstructions] = useState('');

  useEffect(() => {
    let cancelled = false;
    billingApi
      .getTenantSettings()
      .then((s) => {
        if (cancelled) return;
        setSettings(s);
        setVenmoHandle(s.venmo_handle ?? '');
        setVenmoDisplayName(s.venmo_display_name ?? '');
        setZellePhone(s.zelle_phone ?? '');
        setZelleEmail(s.zelle_email ?? '');
        setZelleDisplayName(s.zelle_display_name ?? '');
        setPaymentInstructions(s.payment_instructions ?? '');
      })
      .catch((err) => setError(describeApiError(err)));
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await billingApi.updateTenantSettings({
        venmo_handle: venmoHandle.trim() || undefined,
        venmo_display_name: venmoDisplayName.trim() || undefined,
        zelle_phone: zellePhone.trim() || undefined,
        zelle_email: zelleEmail.trim() || undefined,
        zelle_display_name: zelleDisplayName.trim() || undefined,
        payment_instructions: paymentInstructions || undefined,
      });
      setSettings(updated);
      toast.success('Payment settings saved');
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setSaving(false);
    }
  }

  if (error) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        {error}
      </p>
    );
  }
  if (!settings) return <LoadingState />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Payment settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The Venmo + Zelle handles students see on every invoice you send.
        </p>
      </div>

      <form onSubmit={onSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Venmo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="venmo_handle">Handle (no @)</Label>
              <Input
                id="venmo_handle"
                placeholder="dtspbjj"
                value={venmoHandle}
                onChange={(e) => setVenmoHandle(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Used in the Venmo deep link: amount + invoice description prefilled.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="venmo_display">Display name (optional)</Label>
              <Input
                id="venmo_display"
                placeholder="DTSP BJJ"
                value={venmoDisplayName}
                onChange={(e) => setVenmoDisplayName(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Zelle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="zelle_phone">Phone</Label>
              <Input
                id="zelle_phone"
                placeholder="727-400-2225"
                value={zellePhone}
                onChange={(e) => setZellePhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zelle_email">Email (optional)</Label>
              <Input
                id="zelle_email"
                type="email"
                placeholder="optional@gmail.com"
                value={zelleEmail}
                onChange={(e) => setZelleEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Either phone or email works. Both is fine.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="zelle_display">Display name (optional)</Label>
              <Input
                id="zelle_display"
                placeholder="Fight Trainer"
                value={zelleDisplayName}
                onChange={(e) => setZelleDisplayName(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Instructions on every invoice</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={4}
              value={paymentInstructions}
              onChange={(e) => setPaymentInstructions(e.target.value)}
              placeholder="Tap a button below to pay. After you send, your coach confirms in the app and your package activates."
            />
          </CardContent>
        </Card>

        <Button type="submit" size="lg" disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </form>
    </div>
  );
}
