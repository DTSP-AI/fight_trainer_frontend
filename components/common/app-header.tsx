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
  /** Left of the brand mark — the mobile menu trigger lives here. */
  leading?: React.ReactNode;
  rightSlot?: React.ReactNode;
  /** Role label shown next to the brand mark on wider screens. */
  subtitle?: string;
}

/**
 * Top bar for authed surfaces. Brand mark is the BRAND wordmark (M4).
 * Sign-out drops the Supabase session and routes to /auth/login.
 */
export function AppHeader({ homeHref, leading, rightSlot, subtitle }: AppHeaderProps) {
  const router = useRouter();

  async function handleSignOut() {
    try {
      await signOut();
    } finally {
      router.replace('/auth/login');
    }
  }

  return (
    <header
      className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/95 px-3 backdrop-blur md:px-6"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex min-w-0 items-center gap-2">
        {leading}
        <Link href={homeHref} className="flex items-center gap-2" aria-label="Home">
          <BrandLogo height={34} priority />
          {subtitle ? (
            <span className="hidden text-xs text-muted-foreground md:inline">
              {subtitle}
            </span>
          ) : null}
        </Link>
      </div>
      <div className="flex items-center gap-1">
        {rightSlot}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Account">
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
