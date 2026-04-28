'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { VoiceModeBadge } from '@/components/trainer/voice-mode-badge';
import { studentsApi } from '@/lib/api/students';
import { sessionsApi } from '@/lib/api/sessions';
import { describeApiError } from '@/lib/api';
import type { Student } from '@/lib/types';

const schema = z.object({
  student_id: z.string().min(1, 'Pick a student'),
  session_date: z.string().min(1, 'Required'),
  duration_minutes: z.string().optional(),
  notes: z.string().optional(),
  coaching_cues: z.string().optional(),
  voice_transcript: z.string().optional(),
  sparring_rounds_count: z.string().optional(),
  student_self_rating: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
type SubmitValues = FormValues;

function toNumOrNull(v: string | undefined): number | null {
  if (v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const today = () => new Date().toISOString().slice(0, 10);

export function SessionLogForm() {
  const router = useRouter();
  const params = useSearchParams();
  const initialStudent = params.get('studentId') ?? '';

  const [students, setStudents] = useState<Student[] | null>(null);
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
      student_id: initialStudent,
      session_date: today(),
      notes: '',
      coaching_cues: '',
      voice_transcript: '',
    },
  });

  const studentId = watch('student_id');

  useEffect(() => {
    let cancelled = false;
    studentsApi
      .list()
      .then((res) => {
        if (!cancelled) setStudents(res);
      })
      .catch((err: unknown) => toast.error(describeApiError(err)));
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(values: SubmitValues) {
    setSubmitting(true);
    try {
      const created = await sessionsApi.create({
        student_id: values.student_id,
        session_date: values.session_date,
        duration_minutes: toNumOrNull(values.duration_minutes),
        notes: values.notes || null,
        coaching_cues: values.coaching_cues || null,
        voice_transcript: values.voice_transcript || null,
        sparring_rounds_count: toNumOrNull(values.sparring_rounds_count),
        student_self_rating: toNumOrNull(values.student_self_rating),
        mode: 'text',
      });
      toast.success('Session logged. Pipeline kicked off.', {
        description: 'Clip delivery typically lands within ~90 seconds.',
      });
      router.push(`/trainer/sessions/${created.session_id}`);
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid max-w-3xl gap-6"
      noValidate
    >
      {/* Manifest M2 — voice mode seam visible on the session-log surface. */}
      <VoiceModeBadge />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label>Student</Label>
          <Select
            value={studentId}
            onValueChange={(v) => setValue('student_id', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={students ? 'Pick a student' : 'Loading…'} />
            </SelectTrigger>
            <SelectContent>
              {(students ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.student_id ? (
            <p className="text-xs text-destructive">{errors.student_id.message}</p>
          ) : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="session_date">Session date</Label>
          <Input
            id="session_date"
            type="date"
            {...register('session_date')}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="duration_minutes">Duration (min)</Label>
          <Input
            id="duration_minutes"
            type="number"
            min={1}
            inputMode="numeric"
            {...register('duration_minutes')}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sparring_rounds_count">Sparring rounds</Label>
          <Input
            id="sparring_rounds_count"
            type="number"
            min={0}
            inputMode="numeric"
            {...register('sparring_rounds_count')}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="student_self_rating">Self rating (1-10)</Label>
          <Input
            id="student_self_rating"
            type="number"
            min={1}
            max={10}
            inputMode="numeric"
            {...register('student_self_rating')}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Session notes</Label>
        <Textarea
          id="notes"
          rows={5}
          placeholder="What we worked. What landed in live. What broke down."
          {...register('notes')}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="coaching_cues">Coaching cues</Label>
        <Textarea
          id="coaching_cues"
          rows={3}
          placeholder="The 1-3 things you'd repeat in your student's ear."
          {...register('coaching_cues')}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="voice_transcript">Voice transcript (optional)</Label>
        <Textarea
          id="voice_transcript"
          rows={4}
          placeholder="Paste a dictation transcript here — the pipeline reads this if present."
          {...register('voice_transcript')}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Logging…' : 'Log session'}
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
