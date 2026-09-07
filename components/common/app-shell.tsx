'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { LogOut, Menu, MoreHorizontal, X } from 'lucide-react';
import { AppHeader } from '@/components/common/app-header';
import { BrandLogo } from '@/components/common/brand-logo';
import { cn } from '@/lib/utils';
import { signOut } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** Match this route exactly (dashboards / section roots) instead of by prefix. */
  exact?: boolean;
}

export interface NavGroup {
  /** Sentence-case heading. Omit on the first group to avoid a label above the obvious. */
  title?: string;
  items: NavItem[];
}

interface AppShellProps {
  /** Role label shown next to the brand mark on desktop and in the drawer. */
  role: string;
  homeHref: string;
  groups: NavGroup[];
  /**
   * hrefs that get a slot in the mobile bottom bar (max 4). Everything else
   * lives behind "More", which opens the same drawer as the hamburger.
   */
  primary: string[];
  children: React.ReactNode;
}

function useIsActive() {
  const pathname = usePathname();
  return (item: NavItem) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * Authed app frame. One nav model, three renderings:
 *
 *  - ≥ md   : persistent left sidebar, grouped, active item carries a
 *             primary-colored bar. Header has brand + account.
 *  - < md   : header gains a hamburger (left) that opens a left drawer
 *             (overlay, scroll lock, Esc, focus trap — Radix Dialog).
 *             A fixed bottom bar carries the 4 primary destinations plus
 *             "More", which opens the same drawer. Bottom bar respects the
 *             home-indicator safe area.
 *
 * Every nav link sets aria-current="page" when active; targets are ≥ 44px.
 */
export function AppShell({ role, homeHref, groups, primary, children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const allItems = groups.flatMap((g) => g.items);
  const tabItems = primary
    .map((href) => allItems.find((i) => i.href === href))
    .filter((i): i is NavItem => Boolean(i))
    .slice(0, 4);
  const hasMore = allItems.length > tabItems.length;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader
        homeHref={homeHref}
        subtitle={role}
        leading={
          <DialogPrimitive.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DialogPrimitive.Trigger asChild>
              <button
                type="button"
                className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-md text-foreground hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
            </DialogPrimitive.Trigger>
            <NavDrawer role={role} homeHref={homeHref} groups={groups} />
          </DialogPrimitive.Root>
        }
      />

      <div className="flex flex-1 flex-col md:flex-row">
        <DesktopSidebar role={role} groups={groups} />
        <main
          className={cn(
            'flex-1 overflow-x-auto p-4 md:p-8',
            // Room for the bottom bar + safe area on phones.
            'pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-8',
          )}
        >
          {children}
        </main>
      </div>

      <BottomTabs
        items={tabItems}
        showMore={hasMore}
        onMore={() => setDrawerOpen(true)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Desktop sidebar
// ---------------------------------------------------------------------------

function DesktopSidebar({ role, groups }: { role: string; groups: NavGroup[] }) {
  const isActive = useIsActive();
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-card md:flex md:flex-col">
      <div className="flex h-12 items-center px-5 text-sm font-medium text-muted-foreground">
        {role}
      </div>
      <nav aria-label={`${role} sections`} className="flex-1 space-y-5 px-3 pb-6">
        {groups.map((g, gi) => (
          <div key={g.title ?? gi}>
            {g.title ? (
              <div className="px-3 pb-1 text-xs font-medium text-muted-foreground/80">
                {g.title}
              </div>
            ) : null}
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const active = isActive(item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'relative flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        active
                          ? 'bg-secondary text-foreground'
                          : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                      )}
                    >
                      {active ? (
                        <span
                          aria-hidden
                          className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary"
                        />
                      ) : null}
                      <span aria-hidden className={cn(active ? 'text-primary' : 'text-foreground/70')}>
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Mobile drawer (Radix Dialog rendered as a left sheet)
// ---------------------------------------------------------------------------

function NavDrawer({
  role,
  homeHref,
  groups,
}: {
  role: string;
  homeHref: string;
  groups: NavGroup[];
}) {
  const isActive = useIsActive();
  const router = useRouter();

  async function handleSignOut() {
    try {
      await signOut();
    } finally {
      router.replace('/auth/login');
    }
  }

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="nav-overlay fixed inset-0 z-50 bg-black/60 md:hidden" />
      <DialogPrimitive.Content
        aria-describedby={undefined}
        className="nav-drawer fixed inset-y-0 left-0 z-50 flex w-[min(20rem,85vw)] flex-col border-r border-border bg-card shadow-2xl focus:outline-none md:hidden"
      >
        <div className="flex h-14 items-center justify-between border-b border-border pl-4 pr-2">
          <DialogPrimitive.Title asChild>
            <Link href={homeHref} className="flex items-center gap-2">
              <BrandLogo height={30} />
              <span className="text-xs text-muted-foreground">{role}</span>
            </Link>
          </DialogPrimitive.Title>
          <DialogPrimitive.Close
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </DialogPrimitive.Close>
        </div>

        <nav aria-label={`${role} sections`} className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {groups.map((g, gi) => (
            <div key={g.title ?? gi}>
              {g.title ? (
                <div className="px-3 pb-1 text-xs font-medium text-muted-foreground/80">
                  {g.title}
                </div>
              ) : null}
              <ul className="space-y-0.5">
                {g.items.map((item) => {
                  const active = isActive(item);
                  return (
                    <li key={item.href}>
                      <DialogPrimitive.Close asChild>
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'relative flex h-11 items-center gap-3 rounded-md px-3 text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          active
                            ? 'bg-secondary text-foreground'
                            : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                        )}
                      >
                        {active ? (
                          <span
                            aria-hidden
                            className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary"
                          />
                        ) : null}
                        <span aria-hidden className={cn(active ? 'text-primary' : 'text-foreground/70')}>
                          {item.icon}
                        </span>
                        {item.label}
                      </Link>
                      </DialogPrimitive.Close>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div
          className="border-t border-border p-3"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={handleSignOut}
            className="flex h-11 w-full items-center gap-3 rounded-md px-3 text-[15px] text-muted-foreground hover:bg-secondary/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

// ---------------------------------------------------------------------------
// Mobile bottom tab bar
// ---------------------------------------------------------------------------

function BottomTabs({
  items,
  showMore,
  onMore,
}: {
  items: NavItem[];
  showMore: boolean;
  onMore: () => void;
}) {
  const isActive = useIsActive();
  if (items.length === 0) return null;
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex h-16 items-stretch">
        {items.map((item) => {
          const active = isActive(item);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <span aria-hidden className="[&>svg]:h-5 [&>svg]:w-5">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
        {showMore ? (
          <li className="flex-1">
            <button
              type="button"
              onClick={onMore}
              className="flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] font-medium leading-none text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <MoreHorizontal aria-hidden className="h-5 w-5" />
              More
            </button>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
