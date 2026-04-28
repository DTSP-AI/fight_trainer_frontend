'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Film, Sparkles } from 'lucide-react';
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
import { analyzeApi, type AnalysisListRow } from '@/lib/api/analyze';
import { studentsApi } from '@/lib/api/students';
import { describeApiError } from '@/lib/api';
import { formatDate, formatRelative } from '@/lib/utils';
import type { Student } from '@/lib/types';

const NO_STUDENT = '__none__';

export default function AnalyzePage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [studentId, setStudentId] = useState<string>(NO_STUDENT);
  const [submitting, setSubmitting] = useState(false);

  const [students, setStudents] = useState<Student[] | null>(null);
  const [analyses, setAnalyses] = useState<AnalysisListRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          Paste a YouTube URL. Pick a student to personalize the breakdown to
          their drilling history. Within ~60 seconds you get a coach-grade
          report grounded in verified data.
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
                With a student selected, training_plan and clips will reference
                their recent drills.
              </p>
            </div>
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? 'Starting…' : 'Run analysis'}
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
              <li key={a.id}>
                <Link
                  href={`/trainer/analyze/${a.id}`}
                  className="group block rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-foreground">
                        {a.youtube_url}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
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
                      {a.status} {a.progress_percent}%
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
