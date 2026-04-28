'use client';

import { CalendarDays, Film, User2 } from 'lucide-react';
import { AppHeader } from '@/components/common/app-header';
import { RoleGate } from '@/components/common/role-gate';
import { Sidebar, type SidebarItem } from '@/components/common/sidebar';

const NAV: SidebarItem[] = [
  { href: '/student', label: 'Feed', icon: <Film className="h-4 w-4" /> },
  { href: '/student/plan', label: 'Plan', icon: <CalendarDays className="h-4 w-4" /> },
  { href: '/student/sessions', label: 'History', icon: <Film className="h-4 w-4" /> },
  { href: '/student/profile', label: 'Profile', icon: <User2 className="h-4 w-4" /> },
];

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGate role="student">
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader homeHref="/student" subtitle="Student" />
        <div className="flex flex-1">
          <Sidebar title="Student" items={NAV} />
          <main className="flex-1 overflow-x-auto p-4 md:p-8">{children}</main>
        </div>
      </div>
    </RoleGate>
  );
}
