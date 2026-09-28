'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, Film, Sparkles, Swords, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState } from '@/components/common/loading-state';
import { EmptyState } from '@/components/common/empty-state';
import {
  analyzeApi,
  CONTENT_TYPE_LABEL,
  type AnalysisContentType,
  type AnalysisListRow,
} from '@/lib/api/analyze';
import { studentsApi } from '@/lib/api/students';
import { describeApiError } from '@/lib/api';
import { formatDate, formatRelative } from '@/lib/utils';
import type { Student } from '@/lib/types';

const NO_STUDENT = '__none__';

const CONTENT_TYPES: {
  value: AnalysisContentType;
  label: string;
  blurb: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'full_fight',
    label: 'Full fight',
    blurb:
      'Two fighters, a result. Verified against Wikipedia & Sherdog, broken down round by round.',
    icon: <Swords className="h-5 w-5" />,
  },
  {
    value: 'instructional',
    label: 'Instructional video',
    blurb:
      "A technique breakdown, seminar or film study (Jack Slack, Danaher…). Lead blurb, what's taught in order, takeaways, drills.",
    icon: <BookOpen className="h-5 w-5" />,
  },
];

export default function AnalyzePage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [contentType, setContentType] =
    useState<AnalysisContentType>('full_fight');
  const [studentId, setStudentId] = useState<string>(NO_STUDENT);
  const [submitting, setSubmitting] = useState(false);

  const [students, setStudents] = useState<Student[] | null>(null);
  const [analyses, setAnalyses] = useState<AnalysisListRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function deleteAnalysis(id: string) {
    if (!window.confirm('Delete this breakdown? Its chat and graph links go with it. This cannot be undone.')) {
      return;
    }
    setDeletingId(id);
    try {
      await analyzeApi.delete(id);
      setAnalyses((prev) => (prev ? prev.filter((a) => a.id !== id) : prev));
      toast.success('Breakdown deleted');
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([studentsApi.list(), analyzeApi.list({ limit: 50 })])
      .then(([s, a]) => {
        if (cancelled) return;
        setStudents(s);
        setAnalyses(a);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(describeApiError(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      toast.error('Paste a YouTube URL');
      return;
    }
    setSubmitting(true);
    try {
      const res = await analyzeApi.start({
        youtube_url: url.trim(),
        content_type: contentType,
        student_id: studentId === NO_STUDENT ? null : studentId,
      });
      router.push(`/trainer/analyze/${res.analysis_id}`);
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Fight Analyzer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick what you&apos;re feeding it, paste a YouTube URL, optionally
          pick a student to personalize it to their drilling history. Within
          ~60 seconds you get a coach-grade breakdown.
        </p>
      </div>

      <Card className="surface-3d-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            New analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label>What is this video?</Label>
              <div
                role="radiogroup"
                aria-label="Content type"
                className="grid gap-2 sm:grid-cols-2"
              >
                {CONTENT_TYPES.map((ct) => {
                  const active = ct.value === contentType;
                  return (
                    <button
                      key={ct.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setContentType(ct.value)}
                      className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                        active
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-card hover:border-primary/40'
                      }`}
                    >
                      <span
                        className={`mt-0.5 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`}
                      >
                        {ct.icon}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">
                          {ct.label}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {ct.blurb}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="youtube_url">YouTube URL</Label>
              <Input
                id="youtube_url"
                placeholder="https://youtube.com/watch?v=..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                inputMode="url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student">Personalize for student (optional)</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger id="student">
                  <SelectValue placeholder="Generic analysis (no lens)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_STUDENT}>
                    Generic — no student lens
                  </SelectItem>
                  {(students ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                With a student selected, the training plan and clips reference
                their recent drills
                {contentType === 'instructional'
                  ? ', and the coaching insights say which two techniques from the lesson to drill this week.'
                  : '.'}
              </p>
            </div>
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting
                ? 'Starting…'
                : contentType === 'instructional'
                  ? 'Break down the lesson'
                  : 'Run analysis'}
              {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Recent analyses</h2>
        {error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : analyses === null ? (
          <LoadingState />
        ) : analyses.length === 0 ? (
          <EmptyState
            icon={<Film className="h-8 w-8" />}
            title="No analyses yet"
            description="Run your first one above."
          />
        ) : (
          <ul className="space-y-2">
            {analyses.map((a) => (
              <li key={a.id} className="relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Delete breakdown"
                  title="Delete this breakdown"
                  disabled={deletingId === a.id}
                  onClick={() => void deleteAnalysis(a.id)}
                  className="absolute right-2 top-2 z-10 text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Link
                  href={`/trainer/analyze/${a.id}`}
                  className="group block rounded-lg border border-border bg-card p-4 pr-12 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-foreground">
                        {a.youtube_url}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">
                          {CONTENT_TYPE_LABEL[a.content_type ?? 'full_fight']}
                        </span>
                        <span>·</span>
                        <span>{formatDate(a.created_at)}</span>
                        <span>·</span>
                        <span>{formatRelative(a.created_at)}</span>
                        {a.student_id ? (
                          <>
                            <span>·</span>
                            <span>student-lensed</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <Badge
                      variant={
                        a.status === 'completed'
                          ? 'default'
                          : a.status === 'failed'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {a.status.replace('_', ' ')} {a.progress_percent}%
                    </Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
