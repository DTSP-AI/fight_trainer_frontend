'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Breadcrumbs, type Crumb } from '@/components/common/breadcrumbs';
import { studentsApi } from '@/lib/api/students';

// Tiny per-tab cache so hopping between a client's pages doesn't refetch the
// same name on every render.
const nameCache = new Map<string, string>();

export function useStudentName(studentId?: string | null): string | null {
  // State only holds what a fetch produced; cache hits are derived so the
  // effect never calls setState synchronously.
  const [fetched, setFetched] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => {
    if (!studentId || nameCache.has(studentId)) return;
    let cancelled = false;
    studentsApi
      .get(studentId)
      .then((res) => {
        nameCache.set(studentId, res.student.full_name);
        if (!cancelled) setFetched({ id: studentId, name: res.student.full_name });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [studentId]);
  if (!studentId) return null;
  return nameCache.get(studentId) ?? (fetched?.id === studentId ? fetched.name : null);
}

export function rememberStudentName(id: string, name: string) {
  nameCache.set(id, name);
}

/**
 * Trail for any page that belongs to one client:
 *   Students › {Name} › {current}
 * or, when the page lives under another section (Sessions, Plans, Billing):
 *   {Section} › {Name} › {current}
 * The client's name always links back to their detail page.
 */
export function StudentCrumbs({
  studentId,
  current,
  section,
  className,
}: {
  studentId: string;
  current: string;
  section?: Crumb;
  className?: string;
}) {
  const name = useStudentName(studentId);
  const items: Crumb[] = [
    section ?? { label: 'Students', href: '/trainer/students' },
    { label: name ?? 'Client', href: `/trainer/students/${studentId}` },
    { label: current },
  ];
  return <Breadcrumbs items={items} className={className} />;
}

/**
 * Same trail, driven by a query param (?studentId= / ?student=). Renders
 * nothing when the param is absent so section landing pages stay clean.
 * Must sit under a Suspense boundary (useSearchParams).
 */
export function StudentCrumbsFromQuery({
  param,
  current,
  section,
  className,
}: {
  param: string;
  current: string;
  section?: Crumb;
  className?: string;
}) {
  const params = useSearchParams();
  const studentId = params.get(param);
  if (!studentId) return null;
  return (
    <StudentCrumbs
      studentId={studentId}
      current={current}
      section={section}
      className={className}
    />
  );
}
