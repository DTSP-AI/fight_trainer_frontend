'use client';

import { useEffect, useState } from 'react';
import { TechniqueGraphView } from '@/components/graph/TechniqueGraphView';
import { LoadingState } from '@/components/common/loading-state';
import { studentPortalApi } from '@/lib/api/student-portal';
import { describeApiError } from '@/lib/api';
import type { Student } from '@/lib/types';

export default function StudentGraphPage() {
  const [me, setMe] = useState<Student | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    studentPortalApi
      .me()
      .then((res) => {
        if (!cancelled) setMe(res);
      })
      .catch((err) => {
        if (!cancelled) setError(describeApiError(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        {error}
      </p>
    );
  }
  if (!me) return <LoadingState label="Loading…" />;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Technique graph</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The whole network's combat-sport knowledge map. Your drilled
          techniques light up emerald, current focus glows violet, and the
          recommended next steps burn amber. Click + drag to orbit, scroll
          to zoom.
        </p>
      </div>

      <TechniqueGraphView
        sport={me.primary_sport || undefined}
        studentId={me.id}
        height={680}
      />
    </div>
  );
}
