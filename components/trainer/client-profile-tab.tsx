'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { studentsApi } from '@/lib/api/students';
import { describeApiError } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Student } from '@/lib/types';
import { canResendInvite, useResendInvite } from './use-resend-invite';
import { StudentIntakePanel } from './student-intake-panel';

/**
 * Contact, sign-in, intake, notes, and the danger zone. Lifted from the old
 * StudentDetail so the profile is one tab of the workspace instead of the
 * whole page.
 */
export function ClientProfileTab({
  student,
  onChanged,
}: {
  student: Student;
  onChanged: () => void;
}) {
  const router = useRouter();
  const studentId = student.id;
  const [deleting, setDeleting] = useState(false);
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
      onChanged();
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setSavingEmail(false);
    }
  }

  async function deleteStudent() {
    const name = student.full_name;
    const confirm1 = window.confirm(
      `Delete ${name}? This will cascade-delete every session, package, ` +
        `invoice, plan, and clip delivery for them. This is irreversible.`,
    );
    if (!confirm1) return;
    const typed = window.prompt(`Type the client's full name to confirm: ${name}`);
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

  return (
    <div className="space-y-6">
      {student.invite_status !== 'accepted' ? (
        <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          {student.invite_email ? (
            <p>
              <strong>
                {student.invite_status === 'sent' ? 'Invite sent — awaiting accept' : 'Invite pending'}
              </strong>{' '}
              — emailed <span className="font-mono">{student.invite_email}</span>. If they didn&apos;t get it,
              resend it below.
            </p>
          ) : (
            <p>
              <strong>No invite email on file</strong> — add one so this client can sign in and claim
              their account.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {editingEmail ? (
              <form onSubmit={saveInviteEmail} className="flex flex-wrap items-center gap-2">
                <Input
                  type="email"
                  required
                  autoFocus
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  placeholder="client@example.com"
                  className="h-9 max-w-xs"
                />
                <Button type="submit" size="sm" disabled={savingEmail}>
                  {savingEmail ? 'Saving…' : 'Save email'}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditingEmail(false)}>
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
            {canResendInvite(student) ? (
              <Button size="sm" variant="outline" onClick={() => resendInvite(studentId)} disabled={resending}>
                <Mail className="h-4 w-4" />
                {resending ? 'Sending…' : 'Resend invite'}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Profile</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href={`/trainer/students/${student.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <div className="text-muted-foreground">Phone</div>
            {student.phone ? (
              <a href={`tel:${student.phone}`} className="hover:underline">
                {student.phone}
              </a>
            ) : (
              <span className="text-muted-foreground/70">Not on file</span>
            )}
          </div>
          <div>
            <div className="text-muted-foreground">Date of birth</div>
            {student.date_of_birth ? (
              formatDate(student.date_of_birth)
            ) : (
              <span className="text-muted-foreground/70">Not on file</span>
            )}
          </div>
          <div>
            <div className="text-muted-foreground">Sign-in email</div>
            {student.invite_email ? (
              <span className="font-mono text-xs">{student.invite_email}</span>
            ) : (
              <span className="text-muted-foreground/70">Not on file</span>
            )}
          </div>
          <div>
            <div className="text-muted-foreground">Training since</div>
            {formatDate(student.started_training_at) || (
              <span className="text-muted-foreground/70">Not on file</span>
            )}
          </div>
        </CardContent>
      </Card>

      {student.notes ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0 text-sm leading-relaxed text-muted-foreground">
            {student.notes}
          </CardContent>
        </Card>
      ) : null}

      <StudentIntakePanel studentId={studentId} />

      <Card className="border-rose-500/40">
        <CardHeader>
          <CardTitle className="text-base text-rose-300">Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5 pt-0">
          <p className="text-xs text-muted-foreground">
            Deleting {student.full_name} cascades every session, package, invoice, plan, and clip
            delivery for them. This cannot be undone.
          </p>
          <Button
            variant="outline"
            disabled={deleting}
            onClick={deleteStudent}
            className="border-rose-500/40 text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? 'Deleting…' : 'Delete client'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
