'use client';

import { CalendarDays, ListChecks, Network, Sparkles } from 'lucide-react';
import { AppHeader } from '@/components/common/app-header';
import { RoleGate } from '@/components/common/role-gate';
import { Sidebar, type SidebarItem } from '@/components/common/sidebar';

const NAV: SidebarItem[] = [
  {
    href: '/student/schedule',
    label: 'Schedule',
    icon: <CalendarDays className="h-4 w-4" />,
  },
  {
    href: '/student/sessions',
    label: 'Sessions',
    icon: <ListChecks className="h-4 w-4" />,
  },
  {
    href: '/student/analyzer',
    label: 'Analyzer',
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    href: '/student/graph',
    label: 'Graph',
    icon: <Network className="h-4 w-4" />,
  },
];

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGate role="student">
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader homeHref="/student/schedule" subtitle="Student" />
        <div className="flex flex-1">
          <Sidebar title="Student" items={NAV} />
          <main className="flex-1 overflow-x-auto p-4 md:p-8">{children}</main>
        </div>
      </div>
    </RoleGate>
  );
}
