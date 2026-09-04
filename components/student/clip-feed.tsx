'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Film } from 'lucide-react';
import { ClipCard } from '@/components/student/clip-card';
import { NoticeCard } from '@/components/student/notice-card';
import { LoadingState } from '@/components/common/loading-state';
import { EmptyState } from '@/components/common/empty-state';
import { studentPortalApi } from '@/lib/api/student-portal';
import { describeApiError } from '@/lib/api';
import type { FeedItem } from '@/lib/types';

const PAGE_SIZE = 10;

export function ClipFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadPage = useCallback(
    async (cur: string | null) => {
      if (loading) return;
      setLoading(true);
      setError(null);
      try {
        const params: { limit: number; cursor?: string } = {
          limit: PAGE_SIZE,
        };
        if (cur) params.cursor = cur;
        const res = await studentPortalApi.feed(params);
        setItems((prev) => [...prev, ...res.items]);
        setCursor(res.next_cursor);
        setHasMore(Boolean(res.next_cursor));
      } catch (err) {
        setError(describeApiError(err));
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    },
    [loading],
  );

  useEffect(() => {
    void loadPage(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return;
    const sentinel = sentinelRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting && !loading && hasMore) {
          void loadPage(cursor);
        }
      },
      { rootMargin: '200px' },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [cursor, hasMore, loading, loadPage]);

  if (!initialized) return <LoadingState label="Loading your feed…" />;

  if (error && items.length === 0) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Film className="h-8 w-8" />}
        title="Nothing in your feed yet"
        description="Your coach hasn't logged a session yet — clips show up here after class."
      />
    );
  }

  return (
    <div className="space-y-6">
      {items.map((item) =>
        item.type === 'notice' ? (
          // A session with no matching clip. ClipCard would dereference a null
          // fight, and there is nothing to play, rate, or track anyway.
          <NoticeCard key={item.delivery_id} item={item} />
        ) : (
          <ClipCard key={item.delivery_id} item={item} />
        ),
      )}
      {hasMore ? (
        <div ref={sentinelRef} className="h-10">
          {loading ? <LoadingState label="Loading more…" /> : null}
        </div>
      ) : null}
    </div>
  );
}
