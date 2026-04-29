'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { LoadingState } from '@/components/common/loading-state';
import { EmptyState } from '@/components/common/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { analyzeApi, type AnalysisListRow } from '@/lib/api/analyze';
import { describeApiError } from '@/lib/api';

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

export default function StudentAnalyzerPage() {
  const [analyses, setAnalyses] = useState<AnalysisListRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    analyzeApi
      .list()
      .then((res) => {
        if (!cancelled) setAnalyses(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(describeApiError(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        {error}
      </p>
    );
  }
  if (!analyses) return <LoadingState label="Loading your analyses…" />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Analyzer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fight breakdowns your coach has run for you. Tap one to read the full
          report and chat with the analyzer.
        </p>
      </div>

      {analyses.length === 0 ? (
        <EmptyState
          title="No analyses yet"
          description="When your coach runs a fight breakdown for you it'll show up here."
        />
      ) : (
        <div className="space-y-2">
          {analyses.map((a) => (
            <Link
              key={a.id}
              href={`/trainer/analyze/${a.id}`}
              className="block"
            >
              <Card className="transition-colors hover:border-primary/50">
                <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Sparkles className="h-4 w-4 text-violet-300" />
                      {a.youtube_url
                        ? new URL(a.youtube_url).hostname.replace(
                            'www.',
                            '',
                          ) +
                          ' · ' +
                          (a.youtube_video_id ?? '')
                        : 'Fight analysis'}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Created {fmtDate(a.created_at)}
                      {a.completed_at
                        ? ` · finished ${fmtDate(a.completed_at)}`
                        : ''}
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
                    className="capitalize"
                  >
                    {a.status === 'completed'
                      ? 'Ready'
                      : a.status.replace('_', ' ')}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
