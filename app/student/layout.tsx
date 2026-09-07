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
import { AppShell, type NavGroup } from '@/components/common/app-shell';
import { RoleGate } from '@/components/common/role-gate';
import { IntakeReminder } from '@/components/student/intake-reminder';

const GROUPS: NavGroup[] = [
  {
    items: [
      { href: '/student/feed', label: 'Feed', icon: <Film className="h-4 w-4" /> },
      { href: '/student/schedule', label: 'Schedule', icon: <CalendarDays className="h-4 w-4" /> },
      { href: '/student/plan', label: 'Plan', icon: <CalendarCheck className="h-4 w-4" /> },
      { href: '/student/sessions', label: 'Sessions', icon: <ListChecks className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Study',
    items: [
      { href: '/student/analyzer', label: 'Analyzer', icon: <Sparkles className="h-4 w-4" /> },
      { href: '/student/graph', label: 'Graph', icon: <Network className="h-4 w-4" /> },
    ],
  },
  {
    title: 'You',
    items: [
      { href: '/student/intake', label: 'Intake', icon: <ClipboardList className="h-4 w-4" /> },
      { href: '/student/profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
    ],
  },
];

// Mobile bottom bar — what a fighter opens on the way to the gym.
const PRIMARY = ['/student/feed', '/student/schedule', '/student/plan', '/student/sessions'];

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGate role="student">
      <AppShell
        role="Student"
        homeHref="/student/feed"
        groups={GROUPS}
        primary={PRIMARY}
        accountLinks={[
          { href: '/student/profile', label: 'My profile', icon: <User className="h-4 w-4" /> },
          { href: '/student/intake', label: 'My intake', icon: <ClipboardList className="h-4 w-4" /> },
        ]}
      >
        <IntakeReminder />
        {children}
      </AppShell>
    </RoleGate>
  );
}
