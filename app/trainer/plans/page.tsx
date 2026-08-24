import { Suspense } from 'react';
import { PlanEditor } from '@/components/trainer/plan-editor';
import { PlanAdjustmentsPanel } from '@/components/trainer/plan-adjustments-panel';
import { LoadingState } from '@/components/common/loading-state';

export default function TrainerPlansPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Plans</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mesocycle in one editor. Adjustments propose — you approve.
        </p>
      </div>
      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold">Pending AI adjustments</h2>
          <p className="text-sm text-muted-foreground">
            The pipeline proposes off session signals. Nothing changes until you
            accept.
          </p>
        </div>
        <PlanAdjustmentsPanel />
      </section>

      <Suspense fallback={<LoadingState />}>
        <PlanEditor />
      </Suspense>
    </div>
  );
}
