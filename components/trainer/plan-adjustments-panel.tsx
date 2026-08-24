'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Sparkle, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingState } from '@/components/common/loading-state';
import { EmptyState } from '@/components/common/empty-state';
import { plansApi, type PlanAdjustmentWithPlan } from '@/lib/api/plans';
import { describeApiError } from '@/lib/api';
import { DAYS_OF_WEEK, formatDate, formatRelative } from '@/lib/utils';

/**
 * Proposals the pipeline writes follow the convention in
 * services/plan_adjustment.py:
 *   { plan_id, remove: [planned_session_id], add: [{...}], swap: [], rationale }
 * Anything outside that convention falls through to a raw JSON block so a
 * newer proposal shape is still readable instead of silently dropped.
 */
interface ProposalAdd {
  session_type?: string;
  day_of_week?: number;
  notes?: string;
  targeted_technique_ids?: string[];
}

const KNOWN_KEYS = ['plan_id', 'add', 'remove', 'swap', 'rationale'];

function asAddList(value: unknown): ProposalAdd[] {
  return Array.isArray(value) ? (value as ProposalAdd[]) : [];
}

function asIdList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((v) => String(v)) : [];
}

function ProposalBody({ proposal }: { proposal: Record<string, unknown> }) {
  const adds = asAddList(proposal.add);
  const removes = asIdList(proposal.remove);
  const swaps = asAddList(proposal.swap);
  const rationale =
    typeof proposal.rationale === 'string' ? proposal.rationale : null;
  const extraKeys = Object.keys(proposal).filter(
    (k) => !KNOWN_KEYS.includes(k),
  );

  const nothingKnown =
    adds.length === 0 &&
    removes.length === 0 &&
    swaps.length === 0 &&
    !rationale;

  return (
    <div className="space-y-2 text-sm">
      {rationale ? (
        <p className="text-muted-foreground">
          <span className="text-foreground">Why: </span>
          {rationale}
        </p>
      ) : null}

      {adds.length > 0 ? (
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Add
          </div>
          <ul className="mt-1 space-y-1">
            {adds.map((a, i) => (
              <li
                key={`add-${i}`}
                className="rounded border border-emerald-500/40 bg-emerald-500/10 p-2 text-xs"
              >
                <span className="font-semibold capitalize">
                  {a.session_type ?? 'session'}
                </span>
                {a.day_of_week != null
                  ? ` · ${DAYS_OF_WEEK[a.day_of_week] ?? `day ${a.day_of_week}`}`
                  : ''}
                {a.notes ? (
                  <div className="mt-0.5 text-muted-foreground">{a.notes}</div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {swaps.length > 0 ? (
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Swap
          </div>
          <ul className="mt-1 space-y-1">
            {swaps.map((s, i) => (
              <li
                key={`swap-${i}`}
                className="rounded border border-border bg-background/60 p-2 text-xs"
              >
                <span className="font-semibold capitalize">
                  {s.session_type ?? 'session'}
                </span>
                {s.notes ? (
                  <div className="mt-0.5 text-muted-foreground">{s.notes}</div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {removes.length > 0 ? (
        <div className="rounded border border-rose-500/40 bg-rose-500/10 p-2 text-xs">
          <span className="font-semibold">Remove</span> {removes.length} planned
          session{removes.length === 1 ? '' : 's'}
        </div>
      ) : null}

      {extraKeys.length > 0 || nothingKnown ? (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Raw proposal</summary>
          <pre className="mt-1 overflow-x-auto rounded border border-border bg-background/60 p-2">
            {JSON.stringify(proposal, null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  );
}

function AdjustmentRow({
  row,
  onActed,
}: {
  row: PlanAdjustmentWithPlan;
  onActed: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const plan = row.training_plans ?? null;
  const studentName = plan?.students?.full_name ?? '(unknown student)';

  async function act(action: 'accept' | 'reject', label: string) {
    setBusy(true);
    try {
      await plansApi.ackAdjustment(row.id, { action });
      toast.success(label);
      onActed();
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-border bg-background/40 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold">{studentName}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {plan?.week_start
              ? `Week of ${formatDate(plan.week_start)}`
              : 'Plan removed'}
            {plan?.focus ? ` · ${plan.focus}` : ''}
            {' · proposed '}
            {formatRelative(row.proposed_at)}
          </div>
        </div>
        <Badge variant="secondary">Pending</Badge>
      </div>

      <ProposalBody proposal={row.proposal ?? {}} />

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={busy}
          onClick={() => act('accept', 'Adjustment accepted — plan updated.')}
        >
          <Check className="h-4 w-4" />
          Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => act('reject', 'Adjustment rejected.')}
        >
          <X className="h-4 w-4" />
          Reject
        </Button>
      </div>
    </div>
  );
}

export function PlanAdjustmentsPanel() {
  const [rows, setRows] = useState<PlanAdjustmentWithPlan[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await plansApi.listAdjustments({ pending_only: true });
      setRows(res);
      setError(null);
    } catch (err) {
      setError(describeApiError(err));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (error) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        {error}
      </p>
    );
  }
  if (!rows) return <LoadingState label="Loading adjustments…" />;

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        {rows.length === 0 ? (
          <EmptyState
            icon={<Sparkle className="h-8 w-8" />}
            title="No pending adjustments"
            description="When a logged session signals a change, the proposal lands here for your approval."
          />
        ) : (
          rows.map((row) => (
            <AdjustmentRow key={row.id} row={row} onActed={refresh} />
          ))
        )}
      </CardContent>
    </Card>
  );
}
