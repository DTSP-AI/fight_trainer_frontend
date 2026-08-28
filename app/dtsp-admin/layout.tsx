'use client';

import { Library, Upload, Shield } from 'lucide-react';
import { AppHeader } from '@/components/common/app-header';
import { RoleGate } from '@/components/common/role-gate';
import { Sidebar, type SidebarItem } from '@/components/common/sidebar';

const NAV: SidebarItem[] = [
  { href: '/dtsp-admin', label: 'Overview', icon: <Shield className="h-4 w-4" /> },
  { href: '/dtsp-admin/library', label: 'Library', icon: <Library className="h-4 w-4" /> },
  { href: '/dtsp-admin/import', label: 'Import', icon: <Upload className="h-4 w-4" /> },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGate role="dtsp_admin">
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader homeHref="/dtsp-admin" subtitle="DTSP Admin" />
        <div className="flex flex-1 flex-col md:flex-row">
          <Sidebar title="DTSP Admin" items={NAV} />
          <main className="flex-1 overflow-x-auto p-4 md:p-8">{children}</main>
        </div>
      </div>
    </RoleGate>
  );
}
