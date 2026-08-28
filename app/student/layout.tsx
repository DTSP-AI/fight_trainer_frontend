'use client';

import {
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  Film,
  ListChecks,
  Network,
  Sparkles,
  User,
} from 'lucide-react';
import { AppHeader } from '@/components/common/app-header';
import { RoleGate } from '@/components/common/role-gate';
import { Sidebar, type SidebarItem } from '@/components/common/sidebar';
import { IntakeReminder } from '@/components/student/intake-reminder';

const NAV: SidebarItem[] = [
  {
    href: '/student/feed',
    label: 'Feed',
    icon: <Film className="h-4 w-4" />,
  },
  {
    href: '/student/schedule',
    label: 'Schedule',
    icon: <CalendarDays className="h-4 w-4" />,
  },
  {
    href: '/student/plan',
    label: 'Plan',
    icon: <CalendarCheck className="h-4 w-4" />,
  },
  {
    href: '/student/intake',
    label: 'Intake',
    icon: <ClipboardList className="h-4 w-4" />,
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
  {
    href: '/student/profile',
    label: 'Profile',
    icon: <User className="h-4 w-4" />,
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
        <AppHeader homeHref="/student/feed" subtitle="Student" />
        <div className="flex flex-1 flex-col md:flex-row">
          <Sidebar title="Student" items={NAV} />
          <main className="flex-1 overflow-x-auto p-4 md:p-8">
            <IntakeReminder />
            {children}
          </main>
        </div>
      </div>
    </RoleGate>
  );
}
