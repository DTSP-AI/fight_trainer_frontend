import Link from 'next/link';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Crumb {
  label: string;
  /** Omit on the current page (last crumb). */
  href?: string;
}

/**
 * Page-level trail + explicit "Back" link.
 *
 * Every deep page in a flow (client → billing → session → plan …) renders
 * this so there is always an in-app way back up the tree. The Back link
 * targets the nearest crumb with an href, not browser history — deep links
 * from email or a fresh tab still have somewhere to go.
 */
export function Breadcrumbs({
  items,
  className,
}: {
  items: Crumb[];
  className?: string;
}) {
  if (items.length === 0) return null;
  const parent = [...items].reverse().find((c, i) => i > 0 && c.href);
  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-sm', className)}>
      {parent ? (
        <Link
          href={parent.href!}
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {parent.label}
        </Link>
      ) : null}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-muted-foreground">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <span key={`${c.label}-${i}`} className="flex items-center gap-1">
              {i > 0 ? <ChevronRight className="h-3.5 w-3.5 opacity-60" /> : null}
              {c.href && !last ? (
                <Link href={c.href} className="hover:text-foreground">
                  {c.label}
                </Link>
              ) : (
                <span className={cn(last && 'text-foreground')} aria-current={last ? 'page' : undefined}>
                  {c.label}
                </span>
              )}
            </span>
          );
        })}
      </nav>
    </div>
  );
}
