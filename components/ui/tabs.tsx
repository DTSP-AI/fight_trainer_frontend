'use client';

import { cn } from '@/lib/utils';

/**
 * Minimal accessible tab strip. State lives with the caller (usually the
 * URL — `?tab=`), so a tab is a link-shaped button, not a stateful widget.
 * No Radix dependency: the stack list is complete and this needs none.
 */
export interface TabItem<T extends string> {
  value: T;
  label: string;
  /** Small count rendered after the label — "Sessions 3". */
  badge?: number | null;
}

export function TabStrip<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: TabItem<T>[];
  value: T;
  onChange: (next: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex gap-1 overflow-x-auto border-b border-border',
        className,
      )}
    >
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            type="button"
            aria-selected={active}
            id={`tab-${t.value}`}
            aria-controls={`tabpanel-${t.value}`}
            onClick={() => onChange(t.value)}
            className={cn(
              '-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors',
              active
                ? 'border-primary font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
            {t.badge ? (
              <span
                className={cn(
                  'ml-2 rounded-full px-1.5 py-0.5 text-[11px] leading-none',
                  active
                    ? 'bg-primary/15 text-foreground'
                    : 'bg-secondary text-muted-foreground',
                )}
              >
                {t.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel<T extends string>({
  value,
  active,
  children,
  className,
}: {
  value: T;
  active: T;
  children: React.ReactNode;
  className?: string;
}) {
  if (value !== active) return null;
  return (
    <div
      role="tabpanel"
      id={`tabpanel-${value}`}
      aria-labelledby={`tab-${value}`}
      className={className}
    >
      {children}
    </div>
  );
}
