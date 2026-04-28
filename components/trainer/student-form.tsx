'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { studentsApi } from '@/lib/api/students';
import { describeApiError } from '@/lib/api';
import type { Sport, SkillLevel } from '@/lib/types';

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
      const created = await studentsApi.create({
        full_name: values.full_name,
        primary_sport: values.primary_sport,
        // Only send rank for BJJ. Backend column is nullable for non-BJJ.
        skill_level: isBjj ? (values.skill_level ?? null) : null,
        started_training_at: values.started_training_at || null,
        invite_email: values.invite_email || null,
        notes: values.notes || null,
      });
      toast.success(`Added ${created.full_name}.`);
      router.push(`/trainer/students/${created.id}`);
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setSubmitting(false);
    }
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
        <Textarea
          id="notes"
          rows={4}
          placeholder="Competition prep, injuries, anything that should travel with the student record."
          {...register('notes')}
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
