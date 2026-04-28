'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingState } from '@/components/common/loading-state';
import {
  getCurrentUser,
  getRoleFromUser,
  rolePathRoot,
} from '@/lib/auth';
import type { UserRole } from '@/lib/types';

interface RoleGateProps {
  role: UserRole;
  children: React.ReactNode;
}

/**
 * Client-side belt-and-braces enforcement on top of middleware. Useful so a
 * missed redirect doesn't render the wrong dashboard for a beat. The
 * middleware is still the primary gate.
 */
export function RoleGate({ role, children }: RoleGateProps) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const user = await getCurrentUser();
      if (cancelled) return;
      const userRole = getRoleFromUser(user);
      if (!user) {
        router.replace(`/auth/login?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      if (userRole !== role) {
        router.replace(rolePathRoot(userRole));
        return;
      }
      setReady(true);
    })().catch((err: unknown) => {
      // eslint-disable-next-line no-console
      console.error('RoleGate auth check failed', err);
    });
    return () => {
      cancelled = true;
    };
  }, [role, router]);

  if (!ready) return <LoadingState label="Verifying access…" />;
  return <>{children}</>;
}
