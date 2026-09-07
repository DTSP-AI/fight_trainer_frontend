'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { StudentForm } from '@/components/trainer/student-form';
import { StudentCrumbs } from '@/components/trainer/student-crumbs';
import { LoadingState } from '@/components/common/loading-state';
import { studentsApi } from '@/lib/api/students';
import { describeApiError } from '@/lib/api';
import type { Student } from '@/lib/types';

export default function EditStudentPage() {
  const params = useParams();
  const studentId = String(params?.id ?? '');
  const [student, setStudent] = useState<Student | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    studentsApi
      .get(studentId)
      .then((res) => {
        if (!cancelled) setStudent(res.student);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(describeApiError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <StudentCrumbs studentId={studentId} current="Edit profile" />
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Edit profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Name, sport, rank, start date, notes. Invite email is changed from
          the profile page while the invite is outstanding.
        </p>
      </div>
      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : !student ? (
        <LoadingState label="Loading profile…" />
      ) : (
        <StudentForm initial={student} />
      )}
    </div>
  );
}
