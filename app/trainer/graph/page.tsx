'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { TechniqueGraphView } from '@/components/graph/TechniqueGraphView';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  graphApi,
  type Initiative,
  type RecentContributions,
} from '@/lib/api/graph';
import { LoadingState } from '@/components/common/loading-state';
import { cn } from '@/lib/utils';

const SPORTS = [
  { value: '', label: 'All sports' },
  { value: 'bjj', label: 'BJJ' },
  { value: 'mma', label: 'MMA' },
  { value: 'boxing', label: 'Boxing' },
  { value: 'muay_thai', label: 'Muay Thai' },
  { value: 'kickboxing', label: 'Kickboxing' },
  { value: 'wrestling', label: 'Wrestling' },
];

const INITIATIVE_FILTERS: Array<{
  value: '' | Initiative;
  label: string;
  swatch: string;
}> = [
  { value: '', label: 'All initiatives', swatch: '#475569' },
  { value: 'lead', label: 'Lead', swatch: '#f59e0b' },
  { value: 'sim_counter', label: 'Sim Counter', swatch: '#a78bfa' },
  { value: 'delayed_counter', label: 'Delayed Counter', swatch: '#10b981' },
  { value: 'feint', label: 'Feint', swatch: '#fb7185' },
];

function GraphPageInner() {
  const params = useSearchParams();
  const studentId = params.get('student') ?? undefined;
  const [sport, setSport] = useState<string>('');
  const [initiative, setInitiative] = useState<'' | Initiative>('');
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

      {/* How to read this graph — plain-English intro card */}
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="space-y-2 py-4 text-sm">
          <div className="flex items-center gap-2 font-semibold text-emerald-100">
            <Sparkles className="h-4 w-4 text-emerald-300" />
            How to read this graph
          </div>
          <p className="text-emerald-50/90">
            Every technique is a <strong>junction</strong>, not a leaf. Hover any
            node and you&apos;ll see the chain it sits on light up in two directions:
          </p>
          <ul className="ml-1 space-y-1 text-emerald-50/85">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-sm bg-emerald-400" />
              <span>
                <strong className="text-emerald-100">Forward (offense)</strong>{' '}
                — emerald edges flow{' '}
                <em>out</em> of the technique. These are the moves it sets up.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-sm bg-rose-400" />
              <span>
                <strong className="text-rose-100">Reverse (counter)</strong>{' '}
                — rose edges flow <em>into</em> the technique. These are the
                setups that lead here, and the defenses that stop it.
              </span>
            </li>
          </ul>
          <p className="pt-1 text-emerald-50/85">
            Click a node to open its side panel — connections are grouped as{' '}
            <em>Sets up</em>, <em>Set up by</em>, <em>Counters</em>,{' '}
            <em>Countered by</em> so the palindrome reads in plain English.
            Try hovering <code className="rounded bg-emerald-950/70 px-1.5 py-0.5 text-emerald-100">1-2-3</code>{' '}
            and follow the chain through to <code className="rounded bg-emerald-950/70 px-1.5 py-0.5 text-emerald-100">Stance Switch</code>.
          </p>
        </CardContent>
      </Card>

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

      <div className="space-y-2">
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
        <div className="flex flex-wrap gap-2">
          {INITIATIVE_FILTERS.map((i) => (
            <Button
              key={i.value || 'all'}
              size="sm"
              variant={initiative === i.value ? 'default' : 'outline'}
              onClick={() => setInitiative(i.value)}
              className={cn(
                'gap-1.5',
                initiative === i.value
                  ? 'border-transparent'
                  : 'border-border',
              )}
            >
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ background: i.swatch }}
              />
              {i.label}
            </Button>
          ))}
        </div>
      </div>

      <TechniqueGraphView
        sport={sport || undefined}
        studentId={studentId}
        initiative={initiative || undefined}
        height={680}
        editable
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
