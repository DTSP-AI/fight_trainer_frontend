'use client';

import { useCallback, useEffect, useState } from 'react';
import { Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingState } from '@/components/common/loading-state';
import { AssistedTextarea } from '@/components/common/assisted-textarea';
import { billingApi, type ServiceRow, type Sport } from '@/lib/api/billing';
import { describeApiError } from '@/lib/api';

// The service catalog used to live inside the /trainer/billing hub. It is
// tenant configuration, not per-client work, so it lives under Settings now
// (plan 2026-09-09 Phase 3). Panel code lifted verbatim.

const SPORTS: Sport[] = [
  'bjj',
  'mma',
  'muay_thai',
  'boxing',
  'wrestling',
  'kickboxing',
];

function fmtCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export default function ServicesSettingsPage() {
  const [services, setServices] = useState<ServiceRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setServices(await billingApi.listServices(true));
      setError(null);
    } catch (err) {
      setError(describeApiError(err));
    }
  }, []);

  useEffect(() => {
    // Wrapped so the loader's setState calls land in a promise callback
    // rather than synchronously in the effect body.
    void (async () => {
      await refresh();
    })();
  }, [refresh]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-muted-foreground">
          <Layers className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Services</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Session types, default duration and price, and what the public pricing page shows.
          </p>
        </div>
      </div>
      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : services === null ? (
        <LoadingState />
      ) : (
        <ServicesPanel services={services} onChanged={() => void refresh()} />
      )}
    </div>
  );
}

// ============================================================================
// Services Panel
// ============================================================================

function ServicesPanel({
  services,
  onChanged,
}: {
  services: ServiceRow[];
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        {services.length === 0 ? (
          <EmptyState
            title="No services yet"
            description="Add your first session type below — e.g. '60-min BJJ private'."
          />
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {services.map((s) => (
              <ServiceRowItem key={s.id} s={s} onChanged={onChanged} />
            ))}
          </div>
        )}
        {open ? (
          <NewServiceForm
            onCreated={() => {
              setOpen(false);
              onChanged();
            }}
            onCancel={() => setOpen(false)}
          />
        ) : (
          <Button onClick={() => setOpen(true)} variant="outline" size="sm">
            <Plus className="h-4 w-4" />
            New service
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ServiceRowItem({
  s,
  onChanged,
}: {
  s: ServiceRow;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  async function toggleActive() {
    setBusy(true);
    try {
      await billingApi.updateService(s.id, { is_active: !s.is_active });
      toast.success(s.is_active ? 'Service archived' : 'Service activated');
      onChanged();
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setBusy(false);
    }
  }
  async function deleteService() {
    if (!window.confirm(`Delete service "${s.name}"? This cannot be undone.`)) {
      return;
    }
    setBusy(true);
    try {
      await billingApi.deleteService(s.id);
      toast.success('Service deleted');
      onChanged();
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <EditServiceForm
        s={s}
        onSaved={() => {
          setEditing(false);
          onChanged();
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-background/40 p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {s.name}
          {!s.is_active ? (
            <Badge variant="secondary" className="text-xs">
              archived
            </Badge>
          ) : null}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {s.sport.replace('_', ' ')} · {s.default_duration_minutes}m ·{' '}
          {fmtCents(s.default_price_cents)}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          disabled={busy}
          onClick={() => setEditing(true)}
          aria-label="Edit service"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={toggleActive}>
          {s.is_active ? 'Archive' : 'Activate'}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          disabled={busy}
          onClick={deleteService}
          className="text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
          aria-label="Delete service"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ---- Shared pricing-page fields (the "Include on Pricing Page" toggle) ----
interface PricingFieldsState {
  includeOnPricing: boolean;
  isPopular: boolean;
  cadenceLabel: string;
  sessionsPerMonth: string;
  monthlyPrice: string;
}

function pricingStateFromRow(s: ServiceRow): PricingFieldsState {
  return {
    includeOnPricing: s.include_on_pricing ?? false,
    isPopular: s.is_popular ?? false,
    cadenceLabel: s.cadence_label ?? '',
    sessionsPerMonth: s.sessions_per_month != null ? String(s.sessions_per_month) : '',
    monthlyPrice:
      s.monthly_price_cents != null ? (s.monthly_price_cents / 100).toFixed(2) : '',
  };
}

const EMPTY_PRICING: PricingFieldsState = {
  includeOnPricing: false,
  isPopular: false,
  cadenceLabel: '',
  sessionsPerMonth: '',
  monthlyPrice: '',
};

/** Map form state → the service create/update pricing payload. */
function pricingPayload(p: PricingFieldsState) {
  return {
    include_on_pricing: p.includeOnPricing,
    is_popular: p.isPopular,
    cadence_label: p.cadenceLabel.trim() || null,
    sessions_per_month: p.sessionsPerMonth ? Number(p.sessionsPerMonth) : null,
    monthly_price_cents: p.monthlyPrice
      ? Math.round(Number(p.monthlyPrice) * 100)
      : null,
  };
}

function PricingFields({
  value,
  onChange,
}: {
  value: PricingFieldsState;
  onChange: (next: PricingFieldsState) => void;
}) {
  const set = <K extends keyof PricingFieldsState>(
    key: K,
    v: PricingFieldsState[K],
  ) => onChange({ ...value, [key]: v });

  return (
    <div className="space-y-3 rounded-md border border-dashed border-border p-3">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={value.includeOnPricing}
          onChange={(e) => set('includeOnPricing', e.target.checked)}
        />
        Include on Pricing Page
      </label>
      {value.includeOnPricing && (
        <div className="space-y-3 pl-6">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Cadence label</Label>
              <Input
                value={value.cadenceLabel}
                placeholder="2x per week"
                onChange={(e) => set('cadenceLabel', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Sessions / month</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={value.sessionsPerMonth}
                placeholder="8"
                onChange={(e) => set('sessionsPerMonth', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Monthly price ($)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={value.monthlyPrice}
                placeholder="680"
                onChange={(e) => set('monthlyPrice', e.target.value)}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={value.isPopular}
              onChange={(e) => set('isPopular', e.target.checked)}
            />
            Flag as “Most Popular”
          </label>
          <p className="text-xs text-muted-foreground">
            Duration = session length; Price = per-session. Leave sessions/month
            &amp; monthly price blank for a single-session / drop-in package.
          </p>
        </div>
      )}
    </div>
  );
}

function EditServiceForm({
  s,
  onSaved,
  onCancel,
}: {
  s: ServiceRow;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(s.name);
  const [sport, setSport] = useState<Sport>(s.sport);
  const [duration, setDuration] = useState(String(s.default_duration_minutes));
  const [price, setPrice] = useState((s.default_price_cents / 100).toFixed(2));
  const [description, setDescription] = useState(s.description ?? '');
  const [pricing, setPricing] = useState<PricingFieldsState>(
    pricingStateFromRow(s),
  );
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await billingApi.updateService(s.id, {
        name: name.trim(),
        sport,
        default_duration_minutes: Number(duration),
        default_price_cents: Math.round(Number(price) * 100),
        description: description.trim() || undefined,
        ...pricingPayload(pricing),
      });
      toast.success('Service updated');
      onSaved();
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-md border border-primary/40 bg-background/60 p-4"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Sport</Label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={sport}
            onChange={(e) => setSport(e.target.value as Sport)}
            required
          >
            {SPORTS.map((sp) => (
              <option key={sp} value={sp}>
                {sp.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Duration (min)</Label>
          <Input
            type="number"
            min={15}
            max={480}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Price ($)</Label>
          <Input
            type="number"
            step="0.01"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <AssistedTextarea
          rows={2}
          value={description}
          onChange={setDescription}
          assistKind="service_description"
        />
      </div>
      <PricingFields value={pricing} onChange={setPricing} />
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function NewServiceForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [sport, setSport] = useState<Sport>('bjj');
  const [duration, setDuration] = useState('60');
  const [price, setPrice] = useState('80');
  const [description, setDescription] = useState('');
  const [pricing, setPricing] = useState<PricingFieldsState>(EMPTY_PRICING);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await billingApi.createService({
        name: name.trim(),
        sport,
        default_duration_minutes: Number(duration),
        default_price_cents: Math.round(Number(price) * 100),
        description: description.trim() || undefined,
        ...pricingPayload(pricing),
      });
      toast.success('Service created');
      onCreated();
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-md border border-border bg-background/30 p-4"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="svc_name">Name</Label>
          <Input
            id="svc_name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="60-min BJJ private"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Sport</Label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={sport}
            onChange={(e) => setSport(e.target.value as Sport)}
            required
          >
            {SPORTS.map((sp) => (
              <option key={sp} value={sp}>
                {sp.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="svc_dur">Default duration (min)</Label>
          <Input
            id="svc_dur"
            type="number"
            min={15}
            max={480}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="svc_price">Default price ($)</Label>
          <Input
            id="svc_price"
            type="number"
            step="0.01"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="svc_desc">Description (optional)</Label>
        <AssistedTextarea
          id="svc_desc"
          rows={2}
          value={description}
          onChange={setDescription}
          assistKind="service_description"
        />
      </div>
      <PricingFields value={pricing} onChange={setPricing} />
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save service'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
