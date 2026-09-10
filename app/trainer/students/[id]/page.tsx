import { Suspense } from 'react';
import { ClientWorkspace } from '@/components/trainer/client-workspace';
import { LoadingState } from '@/components/common/loading-state';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function StudentWorkspacePage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-6xl">
      {/* useSearchParams (tab state) needs a Suspense boundary for the
          static shell. */}
      <Suspense fallback={<LoadingState label="Loading client…" />}>
        <ClientWorkspace studentId={id} />
      </Suspense>
    </div>
  );
}
