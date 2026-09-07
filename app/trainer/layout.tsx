'use client';

import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Film,
  Library,
  Network,
  Plug,
  Receipt,
  Sparkles,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react';
import { AppShell, type NavGroup } from '@/components/common/app-shell';
import { RoleGate } from '@/components/common/role-gate';

const GROUPS: NavGroup[] = [
  {
    items: [
      { href: '/trainer', label: 'Dashboard', icon: <Activity className="h-4 w-4" />, exact: true },
      { href: '/trainer/students', label: 'Students', icon: <Users className="h-4 w-4" /> },
      { href: '/trainer/sessions', label: 'Sessions', icon: <Film className="h-4 w-4" /> },
      { href: '/trainer/billing', label: 'Billing', icon: <Receipt className="h-4 w-4" /> },
      { href: '/trainer/plans', label: 'Plans', icon: <CalendarDays className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Study',
    items: [
      { href: '/trainer/library', label: 'Library', icon: <Library className="h-4 w-4" /> },
      { href: '/trainer/analyze', label: 'Analyzer', icon: <Sparkles className="h-4 w-4" /> },
      { href: '/trainer/fighters', label: 'Fighter bank', icon: <Trophy className="h-4 w-4" /> },
      { href: '/trainer/graph', label: 'Graph', icon: <Network className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Watch',
    items: [
      { href: '/trainer/inactivity', label: 'Inactivity', icon: <AlertTriangle className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Settings',
    items: [
      { href: '/trainer/settings/payments', label: 'Payments', icon: <Wallet className="h-4 w-4" /> },
      { href: '/trainer/settings/integrations', label: 'Integrations', icon: <Plug className="h-4 w-4" /> },
    ],
  },
];

// Mobile bottom bar — the four places a coach goes between sessions.
const PRIMARY = ['/trainer', '/trainer/students', '/trainer/sessions', '/trainer/billing'];

export default function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGate role="trainer">
      <AppShell role="Coach" homeHref="/trainer" groups={GROUPS} primary={PRIMARY}>
        {children}
      </AppShell>
    </RoleGate>
  );
}
