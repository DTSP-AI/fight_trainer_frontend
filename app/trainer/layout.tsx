'use client';

import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Film,
  Library,
  Receipt,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import { AppHeader } from '@/components/common/app-header';
import { RoleGate } from '@/components/common/role-gate';
import { Sidebar, type SidebarItem } from '@/components/common/sidebar';

const NAV: SidebarItem[] = [
  { href: '/trainer', label: 'Dashboard', icon: <Activity className="h-4 w-4" /> },
  { href: '/trainer/students', label: 'Students', icon: <Users className="h-4 w-4" /> },
  { href: '/trainer/sessions', label: 'Sessions', icon: <Film className="h-4 w-4" /> },
  { href: '/trainer/billing', label: 'Billing', icon: <Receipt className="h-4 w-4" /> },
  { href: '/trainer/plans', label: 'Plans', icon: <CalendarDays className="h-4 w-4" /> },
  { href: '/trainer/library', label: 'Library', icon: <Library className="h-4 w-4" /> },
  { href: '/trainer/analyze', label: 'Analyzer', icon: <Sparkles className="h-4 w-4" /> },
  {
    href: '/trainer/inactivity',
    label: 'Inactivity',
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  {
    href: '/trainer/settings/payments',
    label: 'Payments',
    icon: <Wallet className="h-4 w-4" />,
  },
];

export default function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGate role="trainer">
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader homeHref="/trainer" subtitle="Coach" />
        <div className="flex flex-1">
          <Sidebar title="Coach" items={NAV} />
          <main className="flex-1 overflow-x-auto p-4 md:p-8">{children}</main>
        </div>
      </div>
    </RoleGate>
  );
}
