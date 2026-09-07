'use client';

import { Library, Upload, Shield } from 'lucide-react';
import { AppShell, type NavGroup } from '@/components/common/app-shell';
import { RoleGate } from '@/components/common/role-gate';

const GROUPS: NavGroup[] = [
  {
    items: [
      { href: '/dtsp-admin', label: 'Overview', icon: <Shield className="h-4 w-4" />, exact: true },
      { href: '/dtsp-admin/library', label: 'Library', icon: <Library className="h-4 w-4" /> },
      { href: '/dtsp-admin/import', label: 'Import', icon: <Upload className="h-4 w-4" /> },
    ],
  },
];

const PRIMARY = ['/dtsp-admin', '/dtsp-admin/library', '/dtsp-admin/import'];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGate role="dtsp_admin">
      <AppShell role="DTSP Admin" homeHref="/dtsp-admin" groups={GROUPS} primary={PRIMARY}>
        {children}
      </AppShell>
    </RoleGate>
  );
}
