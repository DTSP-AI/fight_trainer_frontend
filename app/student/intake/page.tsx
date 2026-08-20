'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { describeApiError } from '@/lib/api';
import {
  intakeApi,
  type IntakeBundle,
  type Waiver,
  type PrimaryGoal,
} from '@/lib/api/intake';

const GOALS: { value: PrimaryGoal; label: string }[] = [
  { value: 'compete', label: 'Compete' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'technique', label: 'Technique' },
  { value: 'self_defense', label: 'Self-defense' },
  { value: 'other', label: 'Other' },
];

const textareaCls =
  'min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

export default function StudentIntakePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bundle, setBundle] = useState<IntakeBundle | null>(null);
  const [waiver, setWaiver] = useState<Waiver | null>(null);

  // form state
  const [ecName, setEcName] = useState('');
  const [ecPhone, setEcPhone] = useState('');
  const [ecRel, setEcRel] = useState('');
  const [years, setYears] = useState('');
  const [priorSports, setPriorSports] = useState('');
  const [background, setBackground] = useState('');
  const [goal, setGoal] = useState<PrimaryGoal | ''>('');
  const [goalDetails, setGoalDetails] = useState('');
  const [signName, setSignName] = useState('');
  const [newInjury, setNewInjury] = useState('');

  const load = useCallback(async () => {
    try {
      const [b, w] = await Promise.all([
        intakeApi.getMine(),
        intakeApi.getActiveWaiver(),
      ]);
      setBundle(b);
      setWaiver(w);
      const i = b.intake;
      if (i) {
        setEcName(i.emergency_contact_name ?? '');
        setEcPhone(i.emergency_contact_phone ?? '');
        setEcRel(i.emergency_contact_relation ?? '');
        setYears(i.years_training != null ? String(i.years_training) : '');
        setPriorSports(i.prior_sports ?? '');
        setBackground(i.background ?? '');
        setGoal((i.primary_goal as PrimaryGoal) ?? '');
        setGoalDetails(i.goal_details ?? '');
      }
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const waiverSigned = Boolean(bundle?.waiver_signed);

  async function onSign() {
    if (!waiver) return;
    if (!signName.trim()) {
      toast.error('Type your full name to sign');
      return;
    }
    try {
      await intakeApi.signWaiver({
        waiver_id: waiver.id,
        signed_name: signName.trim(),
      });
      toast.success('Waiver signed');
      await load();
    } catch (err) {
      toast.error(describeApiError(err));
    }
  }

  async function onAddInjury() {
    if (!newInjury.trim()) return;
    try {
      await intakeApi.addInjury({ body_area: newInjury.trim() });
      setNewInjury('');
      await load();
    } catch (err) {
      toast.error(describeApiError(err));
    }
  }

  async function onRemoveInjury(id: string) {
    try {
      await intakeApi.removeInjury(id);
      await load();
    } catch (err) {
      toast.error(describeApiError(err));
    }
  }

  async function onSave(markComplete: boolean) {
    setSaving(true);
    try {
      await intakeApi.upsertMine({
        emergency_contact_name: ecName.trim() || null,
        emergency_contact_phone: ecPhone.trim() || null,
        emergency_contact_relation: ecRel.trim() || null,
        years_training: years ? Number(years) : null,
        prior_sports: priorSports.trim() || null,
        background: background.trim() || null,
        primary_goal: goal || null,
        goal_details: goalDetails.trim() || null,
        mark_complete: markComplete,
      });
      toast.success(markComplete ? 'Intake complete — thanks!' : 'Saved');
      if (markComplete) {
        router.replace('/student/schedule');
      } else {
        await load();
      }
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-sm text-muted-foreground">Loading intake…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Client intake
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A few things your coach needs before you train.
        </p>
      </div>

      {/* Waiver */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Liability waiver</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!waiver ? (
            <p className="text-sm text-muted-foreground">
              Your coach hasn&apos;t posted a waiver yet — you can skip this for
              now.
            </p>
          ) : waiverSigned ? (
            <p className="rounded-md border border-primary/40 bg-primary/10 p-3 text-sm">
              Signed by{' '}
              <span className="font-semibold">
                {bundle?.waiver_signed?.signed_name}
              </span>{' '}
              (v{bundle?.waiver_signed?.waiver_version}).
            </p>
          ) : (
            <>
              <div className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                {waiver.body}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sign">Type your full name to sign</Label>
                <Input
                  id="sign"
                  value={signName}
                  onChange={(e) => setSignName(e.target.value)}
                  placeholder="Full legal name"
                />
              </div>
              <Button onClick={onSign}>I agree &amp; sign</Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Emergency contact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Emergency contact</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="ec_name">Name</Label>
            <Input id="ec_name" value={ecName} onChange={(e) => setEcName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ec_phone">Phone</Label>
            <Input id="ec_phone" value={ecPhone} onChange={(e) => setEcPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ec_rel">Relationship</Label>
            <Input id="ec_rel" value={ecRel} onChange={(e) => setEcRel(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Injuries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Injuries &amp; limitations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {bundle && bundle.injuries.length > 0 ? (
            <ul className="space-y-2">
              {bundle.injuries.map((inj) => (
                <li
                  key={inj.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span>{inj.body_area}</span>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline underline-offset-4 hover:text-destructive"
                    onClick={() => onRemoveInjury(inj.id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              None listed. Add anything your coach should train around.
            </p>
          )}
          <div className="flex gap-2">
            <Input
              value={newInjury}
              onChange={(e) => setNewInjury(e.target.value)}
              placeholder="e.g. left knee, lower back"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void onAddInjury();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={onAddInjury}>
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Experience */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Experience</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="years">Years training</Label>
              <Input
                id="years"
                type="number"
                min={0}
                step="0.5"
                value={years}
                onChange={(e) => setYears(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prior">Prior sports</Label>
              <Input
                id="prior"
                value={priorSports}
                onChange={(e) => setPriorSports(e.target.value)}
                placeholder="wrestling, boxing…"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bg">Background (optional)</Label>
            <textarea
              id="bg"
              className={textareaCls}
              value={background}
              onChange={(e) => setBackground(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Goals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Primary goal</Label>
            <div className="flex flex-wrap gap-2">
              {GOALS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGoal(g.value)}
                  className={`rounded-md border px-3 py-1.5 text-sm transition ${
                    goal === g.value
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal_details">Details (optional)</Label>
            <textarea
              id="goal_details"
              className={textareaCls}
              value={goalDetails}
              onChange={(e) => setGoalDetails(e.target.value)}
              placeholder="What does success look like for you?"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => onSave(true)} disabled={saving} size="lg">
          {saving ? 'Saving…' : 'Complete intake'}
        </Button>
        <Button
          onClick={() => onSave(false)}
          disabled={saving}
          variant="outline"
          size="lg"
        >
          Save &amp; finish later
        </Button>
      </div>
    </div>
  );
}
