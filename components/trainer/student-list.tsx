'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Mail, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/common/loading-state';
import { EmptyState } from '@/components/common/empty-state';
import { studentsApi } from '@/lib/api/students';
import { describeApiError } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { canResendInvite, useResendInvite } from './use-resend-invite';
import type { Student } from '@/lib/types';

export function StudentList() {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { resendInvite, resendingId } = useResendInvite();

  useEffect(() => {
    let cancelled = false;
    studentsApi
      .list()
      .then((res) => {
        if (!cancelled) setStudents(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(describeApiError(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }
  if (!students) return <LoadingState label="Loading students…" />;
  if (students.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-8 w-8" />}
        title="No students yet"
        description="Add your first student to start logging sessions."
        action={
          <Button asChild>
            <Link href="/trainer/students/new">
              <Plus className="h-4 w-4" />
              Add student
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Sport</TableHead>
            <TableHead>Skill</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.full_name}</TableCell>
              <TableCell className="capitalize">
                {s.primary_sport.replace('_', ' ')}
              </TableCell>
              <TableCell className="capitalize">{s.skill_level ?? '—'}</TableCell>
              <TableCell>{formatDate(s.started_training_at) || '—'}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    s.invite_status === 'accepted'
                      ? 'default'
                      : s.invite_status === 'pending'
                        ? 'outline'
                        : 'secondary'
                  }
                >
                  {s.invite_status ?? 'n/a'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {canResendInvite(s) ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resendInvite(s.id)}
                      disabled={resendingId !== null}
                      title={`Resend the invite email to ${s.invite_email}`}
                    >
                      <Mail className="h-4 w-4" />
                      <span className="hidden sm:inline">
                        {resendingId === s.id ? 'Sending…' : 'Resend invite'}
                      </span>
                    </Button>
                  ) : null}
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/trainer/students/${s.id}`}>Open</Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
