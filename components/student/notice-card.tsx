'use client';

import { Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatRelative } from '@/lib/utils';
import type { FeedNoticeItem } from '@/lib/types';

interface NoticeCardProps {
  item: FeedNoticeItem;
}

/**
 * A logged session that produced no clip.
 *
 * Before this existed the student saw nothing at all for those sessions — the
 * fallback message the pipeline writes was generated and then thrown away.
 * Deliberately quieter than a ClipCard: it is an explanation, not a delivery,
 * and it carries no player, rating, or view tracking because there is nothing
 * to watch.
 */
export function NoticeCard({ item }: NoticeCardProps) {
  return (
    <Card className="border-dashed bg-muted/30">
      <CardContent className="flex gap-3 py-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="space-y-1">
          <p className="text-sm">{item.delivery_message}</p>
          {item.delivered_at ? (
            <p className="text-xs text-muted-foreground">
              {formatRelative(item.delivered_at)}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
