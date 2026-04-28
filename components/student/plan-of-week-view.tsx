'use client';

import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/common/loading-state';
import { EmptyState } from '@/components/common/empty-state';
import { plansApi } from '@/lib/api/plans';
import { studentPortalApi } from '@/lib/api/student-portal';
import { describeApiError } from '@/lib/api';
import { DAYS_OF_WEEK, formatDate } from '@/lib/utils';
import type { PlanCurrentResponse } from '@/lib/types';

export function PlanOfWeekView() {
  const [plan, setPlan] = useState<PlanCurrentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await studentPortalApi.me();
        const current = await plansApi.current(me.id);
        if (!cancelled) setPlan(current);
      } catch (err) {
        if (!cancelled) setError(describeApiError(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }
  if (!plan) return <LoadingState label="Loading plan…" />;
  if (!plan.plan) {
    return (
      <EmptyState
        icon={<CalendarDays className="h-8 w-8" />}
        title="No plan this week"
        description="Your coach hasn't published a weekly plan yet."
      />
    );
  }

  const sessionsByDay: Record<number, typeof plan.planned_sessions> = {};
  for (const ps of plan.planned_sessions) {
    const list = sessionsByDay[ps.day_of_week] ?? [];
    list.push(ps);
    sessionsByDay[ps.day_of_week] = list;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Week of {formatDate(plan.plan.week_start)}
        </h2>
        {plan.plan.focus ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Focus: {plan.plan.focus}
          </p>
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-7">
        {Array.from({ length: 7 }).map((_, day) => {
          const items = sessionsByDay[day] ?? [];
          const dayLabel = DAYS_OF_WEEK[day] ?? '';
          return (
            <Card key={day}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{dayLabel}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-3 pt-0">
                {items.length === 0 ? (
                  <p className="rounded border border-dashed border-border bg-card/50 p-2 text-center text-xs text-muted-foreground">
                    Rest
                  </p>
                ) : (
                  items.map((it) => (
                    <div
                      key={it.id}
                      className="rounded border border-border bg-background p-2"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="capitalize">
                          {it.session_type}
                        </Badge>
                      </div>
                      {it.notes ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {it.notes}
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
