'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarPlus, Pencil, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TabPanel, TabStrip, type TabItem } from '@/components/ui/tabs';
import { Breadcrumbs } from '@/components/common/breadcrumbs';
import { LoadingState } from '@/components/common/loading-state';
import { studentsApi } from '@/lib/api/students';
import { billingApi, type PackageRow, type ServiceRow } from '@/lib/api/billing';
import { describeApiError } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { StudentWorkspace } from '@/lib/types';
import { rememberStudentName } from './student-crumbs';
import { useBookingActions } from './ledger-row-actions';
import { ClientHeaderStrip } from './client-header-strip';
import { SessionLedger, type LedgerFilter } from './session-ledger';
import { ScheduleNewForm } from './schedule-new-form';
import { ClientBillingTab } from './client-billing-tab';
import { ClientSkillsTab } from './client-skills-tab';
import { ClientPlanTab } from './client-plan-tab';
import { ClientProfileTab } from './client-profile-tab';

export type WorkspaceTab = 'sessions' | 'billing' | 'skills' | 'plan' | 'profile';
const TABS: WorkspaceTab[] = ['sessions', 'billing', 'skills', 'plan', 'profile'];

function parseTab(raw: string | null): WorkspaceTab {
  return TABS.includes(raw as WorkspaceTab) ? (raw as WorkspaceTab) : 'sessions';
}

/**
 * One client, one pane. Everything about a client lives here, ordered by
 * what the coach touches most: the session ledger (schedule / done / paid)
 * first, then money, skills, plan, profile.
 *
 * Tabs live in the URL (`?tab=`) so every deep link that used to fan out
 * to a separate page lands on the right tab of this one.
 */
export function ClientWorkspace({ studentId }: { studentId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = parseTab(params.get('tab'));

  const [ws, setWs] = useState<StudentWorkspace | null>(null);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [bookOpen, setBookOpen] = useState(params.get('book') === '1');
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>('all');
  const ledgerRef = useRef<HTMLDivElement | null>(null);

  const reload = useCallback(async () => {
    try {
      const [next, svcs] = await Promise.all([
        studentsApi.workspace(studentId),
        billingApi.listServices(),
      ]);
      rememberStudentName(next.student.id, next.student.full_name);
      setWs(next);
      setServices(svcs);
      setError(null);
    } catch (err) {
      setError(describeApiError(err));
    }
  }, [studentId]);

  useEffect(() => {
    // Wrapped so the loader's setState calls land in a promise callback
    // rather than synchronously in the effect body.
    void (async () => {
      await reload();
    })();
  }, [reload]);

  const actions = useBookingActions({
    onChanged: () => void reload(),
    studentName: ws?.student.full_name,
  });

  function setTab(next: WorkspaceTab) {
    const q = new URLSearchParams(params.toString());
    if (next === 'sessions') q.delete('tab');
    else q.set('tab', next);
    q.delete('book');
    const qs = q.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function openBook() {
    setTab('sessions');
    setBookOpen(true);
  }

  function review() {
    setTab('sessions');
    setLedgerFilter('needs');
    ledgerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }
  if (!ws) return <LoadingState label="Loading client…" />;

  const { student } = ws;
  const needsTotal =
    ws.needs_attention.pending_requests +
    ws.needs_attention.awaiting_payment +
    ws.needs_attention.unlogged_past;

  const tabs: TabItem<WorkspaceTab>[] = [
    { value: 'sessions', label: 'Sessions', badge: needsTotal || null },
    { value: 'billing', label: 'Billing', badge: ws.open_invoices.length || null },
    { value: 'skills', label: 'Skills' },
    { value: 'plan', label: 'Plan', badge: ws.pending_adjustments || null },
    { value: 'profile', label: 'Profile' },
  ];

  // ScheduleNewForm wants the billing PackageRow shape; the workspace
  // carries the same rows (plus service_name), so this is a re-type, not a
  // re-fetch.
  const packages = ws.balance.packages as unknown as PackageRow[];

  // Smart default for "when": the client's usual slot, one week after their
  // most recent locked booking. Empty when there is nothing to go on.
  const defaultWhen = (() => {
    const last = ws.ledger.find((r) => r.status === 'scheduled' || r.status === 'confirmed' || r.status === 'completed');
    if (!last) return undefined;
    const d = new Date(last.scheduled_for);
    if (Number.isNaN(d.getTime())) return undefined;
    d.setDate(d.getDate() + 7);
    while (d.getTime() < Date.parse(ws.generated_at)) d.setDate(d.getDate() + 7);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  })();

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: 'Clients', href: '/trainer/students' },
          { label: student.full_name },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{student.full_name}</h1>
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
            <span>Since {formatDate(student.started_training_at) || '—'}</span>
            {student.invite_status !== 'accepted' ? (
              <Badge variant="outline" className="border-amber-500/50 text-amber-100">
                Invite {student.invite_status === 'sent' ? 'sent' : 'pending'}
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openBook}>
            <CalendarPlus className="h-4 w-4" />
            Book session
          </Button>
          <Button asChild variant="outline">
            <Link href={`/trainer/sessions/new?studentId=${student.id}&walkIn=1`}>
              <Plus className="h-4 w-4" />
              Log walk-in
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href={`/trainer/students/${student.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      <ClientHeaderStrip
        ws={ws}
        actions={actions}
        onBook={openBook}
        onTakePayment={() => setTab('billing')}
        onReview={review}
      />

      <TabStrip tabs={tabs} value={tab} onChange={setTab} />

      <TabPanel value="sessions" active={tab} className="space-y-4">
        <ScheduleNewForm
          students={[student]}
          services={services}
          packages={packages}
          open={bookOpen}
          onOpenChange={setBookOpen}
          defaultStudentId={student.id}
          defaultDateTime={defaultWhen}
          compact
          onCreated={() => {
            setBookOpen(false);
            void reload();
          }}
        />
        <div ref={ledgerRef} className="scroll-mt-20">
          <SessionLedger
            key={ledgerFilter}
            rows={ws.ledger}
            actions={actions}
            studentId={student.id}
            nowIso={ws.generated_at}
            initialFilter={ledgerFilter}
            onBook={openBook}
          />
        </div>
      </TabPanel>

      <TabPanel value="billing" active={tab}>
        <ClientBillingTab studentId={student.id} onChanged={() => void reload()} />
      </TabPanel>

      <TabPanel value="skills" active={tab}>
        <ClientSkillsTab ws={ws} />
      </TabPanel>

      <TabPanel value="plan" active={tab}>
        <ClientPlanTab ws={ws} />
      </TabPanel>

      <TabPanel value="profile" active={tab}>
        <ClientProfileTab student={student} onChanged={() => void reload()} />
      </TabPanel>
    </div>
  );
}
