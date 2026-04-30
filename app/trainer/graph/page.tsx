'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { TechniqueGraphView } from '@/components/graph/TechniqueGraphView';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { graphApi, type RecentContributions } from '@/lib/api/graph';
import { LoadingState } from '@/components/common/loading-state';

const SPORTS = [
  { value: '', label: 'All sports' },
  { value: 'bjj', label: 'BJJ' },
  { value: 'mma', label: 'MMA' },
  { value: 'boxing', label: 'Boxing' },
  { value: 'muay_thai', label: 'Muay Thai' },
  { value: 'kickboxing', label: 'Kickboxing' },
  { value: 'wrestling', label: 'Wrestling' },
];

function GraphPageInner() {
  const params = useSearchParams();
  const studentId = params.get('student') ?? undefined;
  const [sport, setSport] = useState<string>('');
  const [recent, setRecent] = useState<RecentContributions | null>(null);

  useEffect(() => {
    let cancelled = false;
    graphApi
      .recent(7)
      .then((r) => {
        if (!cancelled) setRecent(r);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Technique graph</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Globally shared. Every fight breakdown across the network adds
          edges and bumps node sizes. Click + drag to orbit, scroll to zoom.
          {studentId
            ? ' Showing your student overlay — emerald = drilled, violet = focus, amber = recommended next.'
            : ''}
        </p>
      </div>

      {recent && (recent.new_edges + recent.reinforced_edges + recent.mentions) > 0 ? (
        <Card className="border-violet-500/40 bg-violet-500/5">
          <CardContent className="flex flex-wrap items-center gap-2 py-3 text-sm">
            <Sparkles className="h-4 w-4 text-violet-300" />
            <span className="text-violet-100">This week, the network added</span>
            <span className="font-semibold text-violet-50">
              {recent.new_edges} new edge{recent.new_edges === 1 ? '' : 's'}
            </span>
            <span className="text-violet-100">·</span>
            <span className="font-semibold text-violet-50">
              {recent.reinforced_edges} reinforced
            </span>
            <span className="text-violet-100">·</span>
            <span className="font-semibold text-violet-50">
              {recent.mentions} new mention{recent.mentions === 1 ? '' : 's'}
            </span>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {SPORTS.map((s) => (
          <Button
            key={s.value || 'all'}
            size="sm"
            variant={sport === s.value ? 'default' : 'outline'}
            onClick={() => setSport(s.value)}
          >
            {s.label}
          </Button>
        ))}
      </div>

      <TechniqueGraphView
        sport={sport || undefined}
        studentId={studentId}
        height={680}
      />
    </div>
  );
}

export default function TrainerGraphPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <GraphPageInner />
    </Suspense>
  );
}
