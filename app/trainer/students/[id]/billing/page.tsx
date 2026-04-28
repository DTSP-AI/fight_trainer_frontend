'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Copy, Send, ExternalLink, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/common/loading-state';
import { EmptyState } from '@/components/common/empty-state';
import {
  billingApi,
  type InvoiceRow,
  type PackageRow,
  type ServiceRow,
} from '@/lib/api/billing';
import { studentsApi } from '@/lib/api/students';
import { describeApiError } from '@/lib/api';
import type { Student } from '@/lib/types';

function fmtCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

export default function StudentBillingPage() {
  const params = useParams();
  const studentId = String(params?.id ?? '');

  const [student, setStudent] = useState<Student | null>(null);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [s, svcs, pkgs, invs] = await Promise.all([
        studentsApi.get(studentId),
        billingApi.listServices(),
        billingApi.listPackages(studentId),
        billingApi.listInvoices({ student_id: studentId }),
      ]);
      setStudent(s.student);
      setServices(svcs);
      setPackages(pkgs);
      setInvoices(invs);
    } catch (err) {
      setError(describeApiError(err));
    }
  }, [studentId]);

  useEffect(() => {
    if (!studentId) return;
    void refresh();
  }, [studentId, refresh]);

  if (error) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        {error}
      </p>
    );
  }
  if (!student) return <LoadingState />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/trainer/students/${studentId}`}>
          <ArrowLeft className="h-4 w-4" />
          Back to {student.full_name}
        </Link>
      </Button>

      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Billing — {student.full_name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Packages, custom pricing, invoices, payment status.
        </p>
      </div>

      <NewPackageForm
        services={services}
        studentId={studentId}
        onCreated={refresh}
      />

      <PackagesPanel packages={packages} services={services} onRefresh={refresh} />

      <NewInvoiceForm
        studentId={studentId}
        packages={packages}
        onCreated={refresh}
      />

      <InvoicesPanel invoices={invoices} onRefresh={refresh} />
    </div>
  );
}

// ----------------------------------------------------------------------------
// New package form
// ----------------------------------------------------------------------------

function NewPackageForm({
  services,
  studentId,
  onCreated,
}: {
  services: ServiceRow[];
  studentId: string;
  onCreated: () => void;
}) {
  const [serviceId, setServiceId] = useState('');
  const [totalSessions, setTotalSessions] = useState('10');
  const [pricePerSession, setPricePerSession] = useState('80');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  const total =
    Number(totalSessions || 0) * Number(pricePerSession || 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!serviceId) {
      toast.error('Pick a service');
      return;
    }
    setSubmitting(true);
    try {
      await billingApi.createPackage(studentId, {
        student_id: studentId,
        service_id: serviceId,
        total_sessions: Number(totalSessions),
        price_per_session_cents: Math.round(Number(pricePerSession) * 100),
        notes: notes || undefined,
      });
      toast.success('Package created');
      setOpen(false);
      setNotes('');
      onCreated();
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="outline">
        <Plus className="h-4 w-4" />
        New package
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">New package</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Service</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                required
              >
                <option value="">Pick a service…</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({fmtCents(s.default_price_cents)} default)
                  </option>
                ))}
              </select>
              {services.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No services yet — create one in <Link href="/trainer/services" className="underline">Services</Link>.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="total_sessions">Total sessions</Label>
              <Input
                id="total_sessions"
                type="number"
                min={1}
                value={totalSessions}
                onChange={(e) => setTotalSessions(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_per_session">$ per session</Label>
              <Input
                id="price_per_session"
                type="number"
                step="0.01"
                min={0}
                value={pricePerSession}
                onChange={(e) => setPricePerSession(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Total: <strong>{fmtCents(total * 100)}</strong>
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (off-app context)</Label>
            <Textarea
              id="notes"
              rows={2}
              placeholder="agreed at $80/session over coffee 2026-04-15"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create package'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Packages list panel
// ----------------------------------------------------------------------------

function PackagesPanel({
  packages,
  services,
  onRefresh,
}: {
  packages: PackageRow[];
  services: ServiceRow[];
  onRefresh: () => void;
}) {
  if (packages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Packages</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No packages yet"
            description="Create a package above to start invoicing this student."
          />
        </CardContent>
      </Card>
    );
  }

  const serviceMap = new Map(services.map((s) => [s.id, s]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Packages ({packages.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {packages.map((p) => {
          const svc = serviceMap.get(p.service_id);
          return (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card/60 p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">
                  {svc?.name ?? 'Package'} · {p.total_sessions} sessions @{' '}
                  {fmtCents(p.price_per_session_cents)}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant={p.status === 'active' ? 'default' : 'secondary'}>
                    {p.status}
                  </Badge>
                  <Badge
                    variant={
                      p.payment_status === 'paid'
                        ? 'default'
                        : p.payment_status === 'partial'
                          ? 'outline'
                          : 'secondary'
                    }
                  >
                    {p.payment_status}
                  </Badge>
                  <span>·</span>
                  <span>
                    {p.sessions_remaining}/{p.total_sessions} left
                  </span>
                  <span>·</span>
                  <span>
                    {fmtCents(p.amount_paid_cents)} / {fmtCents(p.total_price_cents)}
                  </span>
                  {p.expires_at ? (
                    <>
                      <span>·</span>
                      <span>expires {fmtDate(p.expires_at)}</span>
                    </>
                  ) : null}
                </div>
                {p.notes ? (
                  <p className="mt-1 text-xs italic text-muted-foreground">
                    {p.notes}
                  </p>
                ) : null}
              </div>
              <RecordPaymentButton pkg={p} onRecorded={onRefresh} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function RecordPaymentButton({
  pkg,
  onRecorded,
}: {
  pkg: PackageRow;
  onRecorded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const due = Math.max(pkg.total_price_cents - pkg.amount_paid_cents, 0);
  const [amount, setAmount] = useState((due / 100).toFixed(2));
  const [method, setMethod] = useState<'venmo' | 'zelle' | 'cash' | 'other'>('venmo');
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (pkg.payment_status === 'paid' && due === 0) return null;

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        Record payment
      </Button>
    );
  }

  async function submit() {
    setSubmitting(true);
    try {
      await billingApi.recordManualPayment(pkg.id, {
        amount_cents: Math.round(Number(amount) * 100),
        method,
        external_reference: reference || undefined,
      });
      toast.success('Payment recorded');
      setOpen(false);
      onRecorded();
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-background/60 p-3">
      <div className="space-y-1">
        <Label className="text-xs">Amount</Label>
        <Input
          type="number"
          step="0.01"
          className="w-24"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Method</Label>
        <select
          className="h-10 rounded-md border border-input bg-background px-2 text-sm"
          value={method}
          onChange={(e) => setMethod(e.target.value as typeof method)}
        >
          <option value="venmo">Venmo</option>
          <option value="zelle">Zelle</option>
          <option value="cash">Cash</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="flex-1 space-y-1 min-w-[140px]">
        <Label className="text-xs">Reference (optional)</Label>
        <Input
          placeholder="@handle / confirm #"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
      </div>
      <Button size="sm" onClick={submit} disabled={submitting}>
        {submitting ? 'Saving…' : 'Save'}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </div>
  );
}

// ----------------------------------------------------------------------------
// New invoice form
// ----------------------------------------------------------------------------

function NewInvoiceForm({
  studentId,
  packages,
  onCreated,
}: {
  studentId: string;
  packages: PackageRow[];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [packageId, setPackageId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await billingApi.createInvoice({
        student_id: studentId,
        package_id: packageId || undefined,
        description: description.trim(),
        amount_cents: Math.round(Number(amount) * 100),
      });
      toast.success('Invoice created');
      setOpen(false);
      setDescription('');
      setAmount('');
      setPackageId('');
      onCreated();
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  function attachPackage(pid: string) {
    setPackageId(pid);
    const p = packages.find((x) => x.id === pid);
    if (p) {
      const due = Math.max(p.total_price_cents - p.amount_paid_cents, 0);
      setAmount((due / 100).toFixed(2));
      setDescription(`Training package — ${p.total_sessions} sessions`);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="outline">
        <Plus className="h-4 w-4" />
        New invoice
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">New invoice</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          {packages.length > 0 ? (
            <div className="space-y-2">
              <Label>Attach to package (optional)</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={packageId}
                onChange={(e) => attachPackage(e.target.value)}
              >
                <option value="">— none (ad-hoc invoice) —</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.total_sessions} sessions · {fmtCents(p.total_price_cents)} ·{' '}
                    {p.payment_status}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Picking a package prefills amount + description.
              </p>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="10x Private MMA sessions @ $80/each"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create invoice'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Invoices panel
// ----------------------------------------------------------------------------

function InvoicesPanel({
  invoices,
  onRefresh,
}: {
  invoices: InvoiceRow[];
  onRefresh: () => void;
}) {
  if (invoices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState title="No invoices yet" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Invoices ({invoices.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {invoices.map((inv) => (
          <InvoiceRowItem key={inv.id} inv={inv} onRefresh={onRefresh} />
        ))}
      </CardContent>
    </Card>
  );
}

function InvoiceRowItem({
  inv,
  onRefresh,
}: {
  inv: InvoiceRow;
  onRefresh: () => void;
}) {
  const [sending, setSending] = useState(false);
  const due = Math.max(inv.amount_cents - inv.amount_paid_cents, 0);
  const publicUrl =
    inv.public_url ??
    (typeof window !== 'undefined'
      ? `${window.location.origin}/invoice/${inv.public_token}`
      : '');

  async function send() {
    setSending(true);
    try {
      const res = await billingApi.sendInvoice(inv.id);
      if (res.delivery.status === 'sent') {
        toast.success('Invoice emailed to student');
      } else if (res.delivery.status === 'skipped') {
        toast(`Email service not configured — copy the link below`, {
          description: 'RESEND_API_KEY env var unset on backend.',
        });
      } else {
        toast.error(res.delivery.error ?? 'Email send failed');
      }
      onRefresh();
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setSending(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success('Public invoice link copied');
    } catch {
      toast.error('Could not copy');
    }
  }

  return (
    <div className="rounded-md border border-border bg-card/60 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-sm font-semibold">{inv.description}</div>
        <Badge
          variant={
            inv.status === 'paid'
              ? 'default'
              : inv.status === 'cancelled'
                ? 'secondary'
                : 'outline'
          }
          className="capitalize"
        >
          {inv.status}
        </Badge>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="font-mono">
          {fmtCents(due)} due / {fmtCents(inv.amount_cents)}
        </span>
        {inv.due_date ? <span>· due {fmtDate(inv.due_date)}</span> : null}
        {inv.viewed_at ? <span>· viewed {fmtDate(inv.viewed_at)}</span> : null}
        {inv.sent_at ? <span>· sent {fmtDate(inv.sent_at)}</span> : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={send} disabled={sending}>
          <Send className="h-4 w-4" />
          {sending ? 'Sending…' : 'Email link'}
        </Button>
        <Button size="sm" variant="outline" onClick={copyLink}>
          <Copy className="h-4 w-4" />
          Copy link
        </Button>
        <Button asChild size="sm" variant="ghost">
          <a href={publicUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" />
            Open
          </a>
        </Button>
      </div>
    </div>
  );
}
