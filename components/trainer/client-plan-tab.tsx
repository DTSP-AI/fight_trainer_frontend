'use client';

import Link from 'next/link';
import { CalendarDays, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { DAYS_OF_WEEK, formatDate } from '@/lib/utils';
import type { StudentWorkspace } from '@/lib/types';

/**
 * The current week's plan, read from the workspace payload. Editing stays
 * on /trainer/plans (the mesocycle editor is cross-client by design); this
 * tab is where the coach sees what's planned and what's been fulfilled
 * without leaving the client.
 */
export function ClientPlanTab({ ws }: { ws: StudentWorkspace }) {
  const { plan_current, pending_adjustments, student } = ws;
  const editHref = `/trainer/plans?studentId=${student.id}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {plan_current ? (
            <>
              Week of <strong className="text-foreground">{formatDate(plan_current.plan.week_start)}</strong>
              {plan_current.plan.focus ? <> · {plan_current.plan.focus}</> : null}
            </>
          ) : (
            'No active plan'
          )}
        </div>
        <div className="flex gap-2">
          {pending_adjustments > 0 ? (
            <Button asChild size="sm" variant="outline" className="border-amber-500/50 text-amber-100">
              <Link href={editHref}>
                {pending_adjustments} AI adjustment{pending_adjustments === 1 ? '' : 's'} to review
              </Link>
            </Button>
          ) : null}
          <Button asChild size="sm">
            <Link href={editHref}>
              <CalendarDays className="h-4 w-4" />
              {plan_current ? 'Edit plan' : 'Build plan'}
            </Link>
          </Button>
        </div>
      </div>

      {!plan_current ? (
        <EmptyState
          title="No plan this week"
          description="Build a weekly plan so sessions have a target and the pipeline can propose adjustments."
          action={
            <Button asChild size="sm">
              <Link href={editHref}>Build plan</Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Planned sessions</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            {plan_current.planned_sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Plan has no sessions yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {plan_current.planned_sessions.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                    <div>
                      <div className="text-sm font-medium">
                        {DAYS_OF_WEEK[p.day_of_week] ?? `Day ${p.day_of_week}`}
                        <span className="ml-2 capitalize text-muted-foreground">{p.session_type}</span>
                      </div>
                      {p.notes ? (
                        <div className="text-xs text-muted-foreground">{p.notes}</div>
                      ) : null}
                    </div>
                    {p.fulfilled_session_id ? (
                      <Badge variant="default">
                        <Check className="mr-1 h-3 w-3" />
                        Logged
                      </Badge>
                    ) : (
                      <Badge variant="outline">Not yet</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
