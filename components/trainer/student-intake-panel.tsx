'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { describeApiError } from '@/lib/api';
import { intakeApi, type IntakeBundle } from '@/lib/api/intake';

/** Read-only coach view of a client's intake (waiver, emergency contact,
 *  injuries, experience, goals). */
export function StudentIntakePanel({ studentId }: { studentId: string }) {
  const [bundle, setBundle] = useState<IntakeBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    intakeApi
      .getStudentIntake(studentId)
      .then((b) => active && setBundle(b))
      .catch((e) => active && setError(describeApiError(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [studentId]);

  const i = bundle?.intake;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Intake</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {loading && <p className="text-muted-foreground">Loading intake…</p>}
        {error && <p className="text-destructive">{error}</p>}
        {!loading && !error && (
          <>
            <div>
              <span className="font-medium">Waiver: </span>
              {bundle?.waiver_signed ? (
                <span className="text-foreground">
                  Signed by {bundle.waiver_signed.signed_name} (v
                  {bundle.waiver_signed.waiver_version})
                </span>
              ) : (
                <span className="text-muted-foreground">Not signed</span>
              )}
            </div>

            <div>
              <span className="font-medium">Emergency contact: </span>
              {i?.emergency_contact_name ? (
                <span>
                  {i.emergency_contact_name}
                  {i.emergency_contact_phone
                    ? ` · ${i.emergency_contact_phone}`
                    : ''}
                  {i.emergency_contact_relation
                    ? ` (${i.emergency_contact_relation})`
                    : ''}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>

            <div>
              <span className="font-medium">Injuries: </span>
              {bundle && bundle.injuries.length > 0 ? (
                <span>
                  {bundle.injuries.map((inj) => inj.body_area).join(', ')}
                </span>
              ) : (
                <span className="text-muted-foreground">None listed</span>
              )}
            </div>

            <div>
              <span className="font-medium">Experience: </span>
              {i?.years_training != null || i?.prior_sports ? (
                <span>
                  {i?.years_training != null ? `${i.years_training} yr` : ''}
                  {i?.prior_sports ? ` · ${i.prior_sports}` : ''}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>

            <div>
              <span className="font-medium">Goal: </span>
              {i?.primary_goal ? (
                <span className="capitalize">
                  {i.primary_goal.replace('_', ' ')}
                  {i.goal_details ? ` — ${i.goal_details}` : ''}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>

            {!i && !bundle?.waiver_signed && (
              <p className="text-muted-foreground">
                This client hasn&apos;t completed intake yet.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
