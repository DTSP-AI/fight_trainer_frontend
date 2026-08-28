'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface SidebarItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  items: SidebarItem[];
  title: string;
}

/**
 * Section navigation for the role surfaces (Coach / Student / DTSP Admin).
 *
 * - md and up: the classic left sidebar.
 * - Below md: the sidebar used to be `hidden` with NO replacement — phones had
 *   no way to navigate between sections at all. Now the section list collapses
 *   into a full-width dropdown bar under the header showing the current
 *   section; tapping it opens the full list.
 */
export function Sidebar({ items, title }: SidebarProps) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const current = items.find((item) => isActive(item.href));

  return (
    <>
      {/* Mobile: current-section dropdown (below md) */}
      <div className="border-b border-border bg-card px-4 py-2 md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between"
              aria-label={`${title} navigation`}
            >
              <span className="flex items-center gap-2">
                <span aria-hidden className="text-foreground/80">
                  {current?.icon}
                </span>
                {current?.label ?? title}
              </span>
              <ChevronDown className="h-4 w-4 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56"
          >
            {items.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link
                  href={item.href}
                  className={cn(
                    'flex w-full items-center gap-3',
                    isActive(item.href)
                      ? 'bg-secondary text-secondary-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  <span aria-hidden className="text-foreground/80">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop: classic left sidebar (unchanged) */}
      <aside className="hidden w-60 shrink-0 border-r border-border bg-card md:flex md:flex-col">
        <div className="flex h-14 items-center border-b border-border px-4">
          <span className="text-sm font-semibold tracking-wide text-foreground">
            {title}
          </span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive(item.href)
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
              )}
            >
              <span aria-hidden className="text-foreground/80">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
