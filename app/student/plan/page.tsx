import { PlanOfWeekView } from '@/components/student/plan-of-week-view';

export default function StudentPlanPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">This week</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What your coach has you working on right now.
        </p>
      </div>
      <PlanOfWeekView />
    </div>
  );
}
