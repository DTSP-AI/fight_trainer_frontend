import { Suspense } from 'react';
import { PlanEditor } from '@/components/trainer/plan-editor';
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
      <Suspense fallback={<LoadingState />}>
        <PlanEditor />
      </Suspense>
    </div>
  );
}
