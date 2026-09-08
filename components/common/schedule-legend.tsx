import { cn } from '@/lib/utils';
import {
  STATUS_LABEL,
  TONE_DOTS,
  type ScheduleTone,
} from '@/lib/schedule-tones';

/**
 * Colour key for the shared schedule calendar. Same component on the coach
 * and the client side so the two screens never drift apart.
 */
export function ScheduleLegend({
  items,
  className,
}: {
  items: ScheduleTone[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground',
        className,
      )}
    >
      {items.map((tone) => (
        <div key={tone} className="flex items-center gap-1">
          <span className={cn('h-2 w-2 rounded-full', TONE_DOTS[tone])} />
          {STATUS_LABEL[tone]}
        </div>
      ))}
    </div>
  );
}
