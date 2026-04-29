'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AssistedTextarea } from '@/components/common/assisted-textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { studentsApi } from '@/lib/api/students';
import { describeApiError } from '@/lib/api';
import type {
  InviteDelivery,
  Sport,
  SkillLevel,
  StudentCreateResponse,
} from '@/lib/types';

const SPORTS: Sport[] = [
  'bjj',
  'mma',
  'muay_thai',
  'boxing',
  'wrestling',
  'kickboxing',
];

// BJJ belt colors. Other sports use rounds/weight class — no rank field shown.
const BJJ_RANKS: SkillLevel[] = [
  'white',
  'blue',
  'purple',
  'brown',
  'black',
  'pro',
];

const schema = z.object({
  full_name: z.string().min(1, 'Required'),
  primary_sport: z.enum([
    'bjj',
    'mma',
    'muay_thai',
    'boxing',
    'wrestling',
    'kickboxing',
  ] as const),
  // Optional — only required when sport is BJJ. Validated in onSubmit guard.
  skill_level: z
    .enum(['white', 'blue', 'purple', 'brown', 'black', 'pro'] as const)
    .optional(),
  started_training_at: z.string().optional().or(z.literal('')),
  invite_email: z.string().email('Invalid email').optional().or(z.literal('')),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function StudentForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<StudentCreateResponse | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: '',
      primary_sport: 'bjj',
      skill_level: 'white',
      started_training_at: '',
      invite_email: '',
      notes: '',
    },
  });

  const sport = watch('primary_sport');
  const skill = watch('skill_level');
  const isBjj = sport === 'bjj';

  async function onSubmit(values: FormValues) {
    if (isBjj && !values.skill_level) {
      toast.error('BJJ students need a belt rank.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await studentsApi.create({
        full_name: values.full_name,
        primary_sport: values.primary_sport,
        // Only send rank for BJJ. Backend column is nullable for non-BJJ.
        skill_level: isBjj ? (values.skill_level ?? null) : null,
        started_training_at: values.started_training_at || null,
        invite_email: values.invite_email || null,
        notes: values.notes || null,
      });
      toast.success(`Added ${result.full_name}.`);
      // If we sent an invite, stay on this page so trainer sees the
      // delivery status + a copyable link. Otherwise jump to detail.
      if (result.invite_link) {
        setCreated(result);
        announceDelivery(result.invite_delivery);
      } else {
        router.push(`/trainer/students/${result.id}`);
      }
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <InviteSentPanel
        student={created}
        onDone={() => router.push(`/trainer/students/${created.id}`)}
      />
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid gap-5 max-w-xl"
      noValidate
    >
      <div className="grid gap-2">
        <Label htmlFor="full_name">Full name</Label>
        <Input id="full_name" autoComplete="off" {...register('full_name')} />
        {errors.full_name ? (
          <p className="text-xs text-destructive">{errors.full_name.message}</p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label>Primary sport</Label>
          <Select
            value={sport}
            onValueChange={(v) => {
              setValue('primary_sport', v as Sport);
              // Clear belt rank when switching off BJJ so it doesn't carry over.
              if (v !== 'bjj') {
                setValue('skill_level', undefined);
              } else if (!skill) {
                setValue('skill_level', 'white');
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPORTS.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isBjj ? (
          <div className="grid gap-2">
            <Label>BJJ belt</Label>
            <Select
              value={skill ?? 'white'}
              onValueChange={(v) => setValue('skill_level', v as SkillLevel)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BJJ_RANKS.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="started_training_at">Started training</Label>
          <Input
            id="started_training_at"
            type="date"
            {...register('started_training_at')}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="invite_email">Invite email</Label>
          <Input
            id="invite_email"
            type="email"
            placeholder="student@email.com"
            {...register('invite_email')}
          />
          {errors.invite_email ? (
            <p className="text-xs text-destructive">
              {errors.invite_email.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <AssistedTextarea
          id="notes"
          rows={4}
          placeholder="Competition prep, injuries, anything that should travel with the student record."
          value={watch('notes') ?? ''}
          onChange={(v) => setValue('notes', v, { shouldDirty: true })}
          assistKind="student_notes"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Add student'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={submitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function announceDelivery(d: InviteDelivery | undefined) {
  if (!d) return;
  if (d.status === 'sent') {
    toast.success('Invite email sent.');
  } else if (d.status === 'skipped') {
    toast(
      'Email service not configured — copy the link below and send it manually.',
      { duration: 6000 },
    );
  } else {
    toast.error(`Invite email failed: ${d.error ?? 'unknown error'}`);
  }
}

function InviteSentPanel({
  student,
  onDone,
}: {
  student: StudentCreateResponse;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const link = student.invite_link ?? '';
  const delivery = student.invite_delivery;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Invite link copied');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy — long-press to select manually');
    }
  }

  return (
    <div className="space-y-4 rounded-md border border-border bg-card/50 p-4">
      <div>
        <h2 className="text-lg font-semibold">
          {student.full_name} added.
        </h2>
        <p className="text-sm text-muted-foreground">
          Invite email targeted at{' '}
          <span className="font-mono">{student.invite_email}</span>.
        </p>
      </div>

      {delivery?.status === 'sent' ? (
        <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
          Email delivered to Resend (id:{' '}
          <span className="font-mono text-xs">
            {delivery.external_id ?? '—'}
          </span>
          ). Tell them to check spam if they don't see it in a minute.
        </p>
      ) : delivery?.status === 'skipped' ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <strong>Email service not configured on the backend.</strong> Set{' '}
          <span className="font-mono">RESEND_API_KEY</span> on Render and a
          verified <span className="font-mono">RESEND_FROM_ADDRESS</span> to
          enable automatic delivery. Until then, copy the link below and send
          it via your own email or text.
        </p>
      ) : (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          Email delivery failed: {delivery?.error ?? 'unknown error'}. Copy
          the link below and send manually.
        </p>
      )}

      <div className="space-y-2">
        <Label>Invite link</Label>
        <div className="flex gap-2">
          <Input value={link} readOnly className="font-mono text-xs" />
          <Button type="button" variant="outline" onClick={copy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Anyone with this link can claim the student account, so don't post
          it publicly.
        </p>
      </div>

      <div className="flex gap-2">
        <Button onClick={onDone}>Done — open student profile</Button>
      </div>
    </div>
  );
}
