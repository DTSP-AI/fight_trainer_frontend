import { Suspense } from 'react';
import { SessionLogForm } from '@/components/trainer/session-log-form';
import { LoadingState } from '@/components/common/loading-state';

export default function NewSessionPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Log session</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick the student, the technique, drop a cue. Pipeline does the rest.
        </p>
      </div>
      <Suspense fallback={<LoadingState />}>
        <SessionLogForm />
      </Suspense>
    </div>
  );
}
