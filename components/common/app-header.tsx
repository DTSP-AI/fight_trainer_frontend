'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, User2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from '@/lib/auth';
import { BrandLogo } from '@/components/common/brand-logo';

interface AppHeaderProps {
  homeHref: string;
  rightSlot?: React.ReactNode;
  /** Optional sub-title under the brand mark. */
  subtitle?: string;
}

/**
 * Top bar for authed surfaces. Brand mark is the BRAND wordmark (M4).
 * Sign-out drops the Supabase session and routes to /auth/login.
 */
export function AppHeader({ homeHref, rightSlot, subtitle }: AppHeaderProps) {
  const router = useRouter();

  async function handleSignOut() {
    try {
      await signOut();
    } finally {
      router.replace('/auth/login');
    }
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-3">
        <Link href={homeHref} className="flex items-center gap-2">
          <BrandLogo height={38} priority />
          {subtitle ? (
            <span className="hidden text-xs text-muted-foreground md:inline">
              · {subtitle}
            </span>
          ) : null}
        </Link>
      </div>
      <div className="flex items-center gap-2">
        {rightSlot}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Account">
              <User2 className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleSignOut}>
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
