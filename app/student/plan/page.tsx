'use client';

import { PlanOfWeekView } from '@/components/student/plan-of-week-view';

export default function StudentPlanPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Plan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your week as your coach laid it out. Rest days are part of the plan.
        </p>
      </div>
      <PlanOfWeekView />
    </div>
  );
}
