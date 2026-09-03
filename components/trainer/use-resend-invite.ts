'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { studentsApi } from '@/lib/api/students';
import { describeApiError } from '@/lib/api';
import type { Student } from '@/lib/types';

/** A student can be re-invited only while the invite is outstanding.
 *
 * `accepted` means they already claimed the roster row via Google OAuth, and
 * no `invite_email` means there is nothing to send to — the backend rejects
 * that case with NO_INVITE_EMAIL (app/api/students.py:283).
 */
export function canResendInvite(
  student: Pick<Student, 'invite_email' | 'invite_status'>,
): boolean {
  return (
    Boolean(student.invite_email) &&
    (student.invite_status === 'pending' || student.invite_status === 'sent')
  );
}

/** Shared resend-invite action for the trainer roster and student detail.
 *
 * Tracks the in-flight student by id so a list can disable just the row that
 * was clicked. `POST /api/students/{id}/resend-invite` does NOT mutate
 * invite_status, so callers must not optimistically advance the badge.
 */
export function useResendInvite() {
  const [resendingId, setResendingId] = useState<string | null>(null);

  async function resendInvite(studentId: string): Promise<void> {
    setResendingId(studentId);
    try {
      const res = await studentsApi.resendInvite(studentId);
      if (res.delivery.status === 'sent') {
        toast.success('Invite resent.');
      } else if (res.delivery.status === 'skipped') {
        // Resend not configured — hand the coach the link so the invite is
        // still deliverable by hand.
        await navigator.clipboard
          .writeText(res.invite_link)
          .catch(() => undefined);
        toast(
          'Email service not configured — invite link copied to clipboard.',
          { duration: 6000 },
        );
      } else {
        toast.error(`Resend failed: ${res.delivery.error ?? 'unknown'}`);
      }
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setResendingId(null);
    }
  }

  return { resendInvite, resendingId };
}
