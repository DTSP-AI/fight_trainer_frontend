'use client';

import Link from 'next/link';
import { Network } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { formatDate, formatRelative } from '@/lib/utils';
import type { StudentWorkspace } from '@/lib/types';

const PROFICIENCY_LABEL: Record<string, string> = {
  drilled_clean: 'Clean',
  struggled: 'Struggled',
  first_exposure: 'First look',
};

export function ClientSkillsTab({ ws }: { ws: StudentWorkspace }) {
  const { skill_summary, recent_sessions, recent_deliveries, student } = ws;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          <strong className="text-foreground">{skill_summary.sessions_90d}</strong> session
          {skill_summary.sessions_90d === 1 ? '' : 's'} logged in the last 90 days
          {skill_summary.skill_level ? (
            <>
              {' '}
              · <span className="capitalize">{skill_summary.skill_level}</span>
            </>
          ) : null}
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/trainer/graph?student=${student.id}`}>
            <Network className="h-4 w-4" />
            Technique graph
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Techniques drilled</CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          {skill_summary.techniques.length === 0 ? (
            <EmptyState
              title="No techniques extracted yet"
              description="Log a session with notes or cues and the pipeline fills this in."
            />
          ) : (
            <ul className="divide-y divide-border">
              {skill_summary.techniques.map((t) => (
                <li key={t.technique_id} className="flex items-center justify-between gap-3 py-2">
                  <div>
                    <div className="text-sm font-medium">
                      {(t.name ?? 'technique').replace(/_/g, ' ')}
                    </div>
                    {t.category ? (
                      <div className="text-xs capitalize text-muted-foreground">
                        {t.category.replace(/_/g, ' ')}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {t.last_proficiency ? (
                      <Badge variant="outline" className="font-normal">
                        {PROFICIENCY_LABEL[t.last_proficiency] ?? t.last_proficiency}
                      </Badge>
                    ) : null}
                    <Badge variant="secondary">
                      ×{t.times_drilled}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent logs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-5 pt-0">
            {recent_sessions.length === 0 ? (
              <EmptyState title="No sessions logged" description="Mark a session done to start the loop." />
            ) : (
              recent_sessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/trainer/sessions/${s.id}`}
                  className="flex items-center justify-between rounded-md border border-border bg-background p-3 transition-colors hover:bg-secondary/40"
                >
                  <div>
                    <div className="text-sm font-medium">{formatDate(s.session_date)}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.duration_minutes ? `${s.duration_minutes} min` : 'duration n/a'}
                    </div>
                  </div>
                  <Badge variant={s.status === 'delivered' ? 'default' : 'outline'} className="capitalize">
                    {s.status}
                  </Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clips delivered</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-5 pt-0">
            {recent_deliveries.length === 0 ? (
              <EmptyState
                title="No clips delivered yet"
                description="Clips show up after a logged session is processed."
              />
            ) : (
              recent_deliveries.map((d) => (
                <div key={d.id} className="rounded-md border border-border bg-background p-3">
                  <div className="text-xs text-muted-foreground">{formatRelative(d.delivered_at)}</div>
                  <p className="mt-1 line-clamp-2 text-sm">{d.delivery_message}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
