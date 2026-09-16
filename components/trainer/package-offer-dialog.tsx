'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { PackageRow, ServiceRow } from '@/lib/api/billing';
import { packageOffersApi } from '@/lib/api/package-offers';
import { describeApiError } from '@/lib/api';
import { fmtCents } from './ledger-row-actions';

/**
 * 'Send new package' — the action behind the re-up signal. Pre-filled from
 * the package that is running low (same service, size, price); every field
 * is editable so the coach can upsell, discount, or switch service.
 */
interface OfferFormProps {
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  services: ServiceRow[];
  /** The package to suggest from — usually the one that triggered the signal. */
  basePackage: PackageRow | null;
  onSent: () => void;
}

export function PackageOfferDialog({
  open,
  ...props
}: OfferFormProps & { open: boolean }) {
  return (
    <Dialog open={open} onOpenChange={props.onOpenChange}>
      {/* Mounted fresh on every open so the form re-seeds from basePackage
          without a setState-in-effect. */}
      {open ? <OfferForm {...props} /> : null}
    </Dialog>
  );
}

function OfferForm({
  onOpenChange,
  studentId,
  studentName,
  services,
  basePackage,
  onSent,
}: OfferFormProps) {
  const first = services[0];
  const [serviceId, setServiceId] = useState(
    basePackage?.service_id ?? first?.id ?? '',
  );
  const [totalSessions, setTotalSessions] = useState(
    basePackage ? String(basePackage.total_sessions) : '10',
  );
  const [pricePerSession, setPricePerSession] = useState(
    basePackage
      ? (basePackage.price_per_session_cents / 100).toString()
      : first
        ? (first.default_price_cents / 100).toString()
        : '80',
  );
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const sessions = Number(totalSessions || 0);
  const price = Number(pricePerSession || 0);
  const totalCents = Math.round(sessions * price * 100);
  const sameAsLast =
    !!basePackage &&
    basePackage.service_id === serviceId &&
    basePackage.total_sessions === sessions &&
    basePackage.price_per_session_cents === Math.round(price * 100);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!serviceId) {
      toast.error('Pick a service');
      return;
    }
    if (sessions < 1) {
      toast.error('At least one session');
      return;
    }
    setSubmitting(true);
    try {
      const res = await packageOffersApi.send(studentId, {
        service_id: serviceId,
        total_sessions: sessions,
        price_per_session_cents: Math.round(price * 100),
        message: message.trim() || undefined,
        source_package_id: basePackage?.id,
      });
      const delivered = res.delivery.status === 'sent';
      toast.success(
        delivered
          ? `Offer sent to ${studentName} — email + push`
          : `Offer is live in ${studentName}'s app (no email on file)`,
      );
      if (res.superseded > 0) toast.info('Replaced the previous open offer');
      onOpenChange(false);
      onSent();
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Send {studentName} their next package</DialogTitle>
        <DialogDescription>
          {basePackage
            ? 'Suggested from their current package. Change anything before you send.'
            : 'No package to copy from — set it up from scratch.'}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='offer_service'>Service</Label>
          <select
            id='offer_service'
            className='h-10 w-full rounded-md border border-input bg-background px-3 text-sm'
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            required
          >
            <option value=''>Pick a service…</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({fmtCents(s.default_price_cents)} default)
              </option>
            ))}
          </select>
        </div>
        <div className='grid gap-4 md:grid-cols-2'>
          <div className='space-y-2'>
            <Label htmlFor='offer_sessions'>Sessions</Label>
            <Input
              id='offer_sessions'
              type='number'
              min={1}
              max={100}
              value={totalSessions}
              onChange={(e) => setTotalSessions(e.target.value)}
              required
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='offer_price'>$ per session</Label>
            <Input
              id='offer_price'
              type='number'
              step='0.01'
              min={0}
              value={pricePerSession}
              onChange={(e) => setPricePerSession(e.target.value)}
              required
            />
          </div>
        </div>
        <p className='text-sm'>
          Total: <strong>{fmtCents(totalCents)}</strong>
          {sameAsLast ? (
            <span className='ml-2 text-xs text-muted-foreground'>
              same as their last package
            </span>
          ) : null}
        </p>
        <div className='space-y-2'>
          <Label htmlFor='offer_message'>
            Note to {studentName} (optional)
          </Label>
          <Textarea
            id='offer_message'
            rows={2}
            placeholder="Let's keep the momentum — same slot, same deal."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button
            type='button'
            variant='ghost'
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type='submit' disabled={submitting}>
            <Send className='h-4 w-4' />
            {submitting ? 'Sending…' : 'Send offer'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
