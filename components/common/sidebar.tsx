'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
 * - Below md: an animated hamburger bar under the header. The three lines
 *   morph into an X on open, and the section list slides down beneath it.
 *   (The sidebar used to be `hidden` on mobile with NO replacement — phones
 *   had no way to navigate between sections at all.)
 */
export function Sidebar({ items, title }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const current = items.find((item) => isActive(item.href));

  // Close the panel whenever navigation happens.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile: animated hamburger + slide-down nav (below md) */}
      <div className="border-b border-border bg-card md:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-section-nav"
          aria-label={`${title} navigation`}
          className="flex w-full items-center gap-3 px-4 py-3 text-sm text-foreground"
        >
          {/* Animated hamburger: three bars morph into an X */}
          <span aria-hidden className="relative block h-4 w-5">
            <span
              className={cn(
                'absolute left-0 top-0 block h-0.5 w-5 rounded-full bg-foreground transition-all duration-300',
                open && 'top-[7px] rotate-45',
              )}
            />
            <span
              className={cn(
                'absolute left-0 top-[7px] block h-0.5 w-5 rounded-full bg-foreground transition-all duration-300',
                open && 'opacity-0',
              )}
            />
            <span
              className={cn(
                'absolute bottom-0 left-0 block h-0.5 w-5 rounded-full bg-foreground transition-all duration-300',
                open && 'bottom-[7px] -rotate-45',
              )}
            />
          </span>
          <span className="flex items-center gap-2 font-medium">
            <span aria-hidden className="text-foreground/80">
              {current?.icon}
            </span>
            {current?.label ?? title}
          </span>
        </button>

        {/* Slide-down panel */}
        <nav
          id="mobile-section-nav"
          className={cn(
            'grid overflow-hidden transition-all duration-300 ease-in-out',
            open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="space-y-1 border-t border-border p-3">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
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
            </div>
          </div>
        </nav>
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
