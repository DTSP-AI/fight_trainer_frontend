'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarPlus, Mail, Plus, Receipt, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/common/loading-state';
import { EmptyState } from '@/components/common/empty-state';
import { studentsApi } from '@/lib/api/students';
import { describeApiError } from '@/lib/api';
import { formatDate, formatRelative } from '@/lib/utils';
import { canResendInvite, useResendInvite } from './use-resend-invite';
import type { StudentDetailResponse } from '@/lib/types';

interface StudentDetailProps {
  studentId: string;
}

export function StudentDetail({ studentId }: StudentDetailProps) {
  const router = useRouter();
  const [data, setData] = useState<StudentDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const { resendInvite, resendingId } = useResendInvite();
  const resending = resendingId === studentId;

  async function saveInviteEmail(e: React.FormEvent) {
    e.preventDefault();
    const next = emailDraft.trim().toLowerCase();
    if (!next) return;
    setSavingEmail(true);
    try {
      await studentsApi.update(studentId, { invite_email: next });
      toast.success('Invite email updated — hit "Resend invite" to send it.');
      setEditingEmail(false);
      setReloadTick((t) => t + 1);
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setSavingEmail(false);
    }
  }

  async function deleteStudent() {
    const name = data?.student.full_name ?? 'this student';
    const confirm1 = window.confirm(
      `Delete ${name}? This will cascade-delete every session, package, ` +
        `invoice, plan, and clip delivery for them. This is irreversible.`,
    );
    if (!confirm1) return;
    const typed = window.prompt(
      `Type the student's full name to confirm: ${name}`,
    );
    if ((typed ?? '').trim() !== name) {
      toast.error('Name did not match — delete cancelled.');
      return;
    }
    setDeleting(true);
    try {
      await studentsApi.delete(studentId);
      toast.success(`${name} deleted.`);
      router.push('/trainer/students');
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    studentsApi
      .get(studentId)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(describeApiError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, reloadTick]);

  if (error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }
  if (!data) return <LoadingState label="Loading student…" />;

  const { student, recent_sessions, recent_deliveries } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {student.full_name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary" className="capitalize">
              {student.primary_sport.replace('_', ' ')}
            </Badge>
            {student.skill_level ? (
              <Badge variant="outline" className="capitalize">
                {student.skill_level}
              </Badge>
            ) : null}
            <span>·</span>
            <span>Started {formatDate(student.started_training_at) || '—'}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`/trainer/sessions/new?studentId=${student.id}`}>
              <Plus className="h-4 w-4" />
              Log session
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/trainer/plans?studentId=${student.id}`}>
              Edit plan
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/trainer/billing?student=${student.id}&tab=schedule`}>
              <CalendarPlus className="h-4 w-4" />
              Book session
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/trainer/students/${student.id}/billing`}>
              <Receipt className="h-4 w-4" />
              Billing &amp; invoices
            </Link>
          </Button>
          {canResendInvite(student) ? (
            <Button
              variant="outline"
              onClick={() => resendInvite(studentId)}
              disabled={resending}
            >
              <Mail className="h-4 w-4" />
              {resending ? 'Sending…' : 'Resend invite'}
            </Button>
          ) : null}
        </div>
      </div>

      {student.invite_status !== 'accepted' ? (
        <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          {student.invite_email ? (
            <p>
              <strong>
                {student.invite_status === 'sent'
                  ? 'Invite sent — awaiting accept'
                  : 'Invite pending'}
              </strong>{' '}
              — emailed{' '}
              <span className="font-mono">{student.invite_email}</span>. If they
              didn&apos;t get it, hit &quot;Resend invite&quot; above.
            </p>
          ) : (
            <p>
              <strong>No invite email on file</strong> — add one so this
              student can sign in and claim their account.
            </p>
          )}
          {editingEmail ? (
            <form onSubmit={saveInviteEmail} className="flex flex-wrap items-center gap-2">
              <Input
                type="email"
                required
                autoFocus
                value={emailDraft}
                onChange={(e) => setEmailDraft(e.target.value)}
                placeholder="student@example.com"
                className="h-9 max-w-xs"
              />
              <Button type="submit" size="sm" disabled={savingEmail}>
                {savingEmail ? 'Saving…' : 'Save email'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setEditingEmail(false)}
              >
                Cancel
              </Button>
            </form>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setEmailDraft(student.invite_email ?? '');
                setEditingEmail(true);
              }}
            >
              {student.invite_email ? 'Change email' : 'Add invite email'}
            </Button>
          )}
        </div>
      ) : null}

      {student.notes ? (
        <Card>
          <CardContent className="p-5 text-sm leading-relaxed text-muted-foreground">
            {student.notes}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-5 pt-0">
            {recent_sessions.length === 0 ? (
              <EmptyState
                title="No sessions logged"
                description="Log a session to start the loop."
                action={
                  <Button asChild size="sm">
                    <Link href={`/trainer/sessions/new?studentId=${student.id}`}>
                      Log session
                    </Link>
                  </Button>
                }
              />
            ) : (
              recent_sessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/trainer/sessions/${s.id}`}
                  className="flex items-center justify-between rounded-md border border-border bg-background p-3 transition-colors hover:bg-secondary/40"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {formatDate(s.session_date)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {s.duration_minutes
                        ? `${s.duration_minutes} min`
                        : 'duration n/a'}{' '}
                      · {s.status}
                    </div>
                  </div>
                  <Badge
                    variant={s.status === 'completed' ? 'default' : 'outline'}
                    className="capitalize"
                  >
                    {s.status}
                  </Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clips delivered</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-5 pt-0">
            {recent_deliveries.length === 0 ? (
              <EmptyState
                title="No clips delivered yet"
                description="Clips show up after a logged session is processed."
              />
            ) : (
              recent_deliveries.map((d) => (
                <div
                  key={d.id}
                  className="rounded-md border border-border bg-background p-3"
                >
                  <div className="text-xs text-muted-foreground">
                    {formatRelative(d.delivered_at)}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm">{d.delivery_message}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-rose-500/40">
        <CardHeader>
          <CardTitle className="text-base text-rose-300">
            Danger zone
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5 pt-0">
          <p className="text-xs text-muted-foreground">
            Deleting {student.full_name} cascades every session, package,
            invoice, plan, and clip delivery for them. This cannot be undone.
          </p>
          <Button
            variant="outline"
            disabled={deleting}
            onClick={deleteStudent}
            className="border-rose-500/40 text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? 'Deleting…' : 'Delete student'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
