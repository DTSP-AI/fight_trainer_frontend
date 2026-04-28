'use client';

import { useEffect, useMemo, useState } from 'react';
import { Library as LibraryIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/common/loading-state';
import { EmptyState } from '@/components/common/empty-state';
import { libraryApi } from '@/lib/api/library';
import { describeApiError } from '@/lib/api';
import type { Sport, Technique } from '@/lib/types';

const SPORTS: { value: Sport; label: string }[] = [
  { value: 'bjj', label: 'BJJ' },
  { value: 'mma', label: 'MMA' },
  { value: 'muay_thai', label: 'Muay Thai' },
  { value: 'boxing', label: 'Boxing' },
  { value: 'wrestling', label: 'Wrestling' },
  { value: 'kickboxing', label: 'Kickboxing' },
];

export default function TrainerLibraryPage() {
  const [sport, setSport] = useState<Sport>('bjj');
  const [techniques, setTechniques] = useState<Technique[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setTechniques(null);
    setError(null);
    libraryApi
      .techniques({ sport, limit: 200 })
      .then((res) => {
        if (!cancelled) setTechniques(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(describeApiError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [sport]);

  const grouped = useMemo(() => {
    if (!techniques) return new Map<string, Technique[]>();
    const m = new Map<string, Technique[]>();
    for (const t of techniques) {
      const key = t.category ?? 'uncategorized';
      const arr = m.get(key) ?? [];
      arr.push(t);
      m.set(key, arr);
    }
    return m;
  }, [techniques]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Library</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Canonical taxonomy. The vocabulary the pipeline matches against.
          </p>
        </div>
        <div className="w-48">
          <Select value={sport} onValueChange={(v) => setSport(v as Sport)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : techniques === null ? (
        <LoadingState />
      ) : techniques.length === 0 ? (
        <EmptyState
          icon={<LibraryIcon className="h-8 w-8" />}
          title="Empty taxonomy"
          description="No techniques imported for this sport yet."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {[...grouped.entries()].map(([category, items]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-base capitalize">
                  {category.replace(/_/g, ' ')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-wrap gap-2">
                  {items.map((t) => (
                    <li key={t.id}>
                      <Badge variant="secondary" className="font-normal">
                        {t.name}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
