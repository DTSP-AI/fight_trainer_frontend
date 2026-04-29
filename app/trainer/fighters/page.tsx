'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Trophy } from 'lucide-react';
import { LoadingState } from '@/components/common/loading-state';
import { EmptyState } from '@/components/common/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { fightersApi, type FighterRow } from '@/lib/api/fighters';
import { describeApiError } from '@/lib/api';

export default function FighterBankPage() {
  const [fighters, setFighters] = useState<FighterRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    fightersApi
      .list()
      .then((res) => {
        if (!cancelled) setFighters(res);
      })
      .catch((err) => {
        if (!cancelled) setError(describeApiError(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!fighters) return [];
    const q = query.trim().toLowerCase();
    if (!q) return fighters;
    return fighters.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.nickname ?? '').toLowerCase().includes(q),
    );
  }, [fighters, query]);

  if (error) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        {error}
      </p>
    );
  }
  if (!fighters) return <LoadingState label="Loading fighter bank…" />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Fighter bank</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every fighter you've analyzed lands here automatically. Click one
          to see their fight history with you and chat about their style.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or nickname…"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={
            fighters.length === 0
              ? 'Fighter bank is empty'
              : 'No matches'
          }
          description={
            fighters.length === 0
              ? 'Run a fight analysis from the Analyzer — both fighters get added here automatically.'
              : 'Try a different search.'
          }
        />
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {filtered.map((f) => (
            <Link
              key={f.id}
              href={`/trainer/fighters/${f.id}`}
              className="block"
            >
              <Card className="transition-colors hover:border-primary/50">
                <CardContent className="flex items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Trophy className="h-4 w-4 text-amber-300" />
                      {f.name}
                      {f.nickname ? (
                        <span className="text-xs italic text-muted-foreground">
                          "{f.nickname}"
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      {f.discipline ? (
                        <Badge variant="outline" className="capitalize">
                          {f.discipline.replace('_', ' ')}
                        </Badge>
                      ) : null}
                      {f.weight_class ? (
                        <Badge variant="outline">{f.weight_class}</Badge>
                      ) : null}
                      {f.current_events_summary ? (
                        <span className="text-emerald-300">· news on file</span>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
