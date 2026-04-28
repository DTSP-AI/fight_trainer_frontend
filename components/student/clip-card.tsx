'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { studentPortalApi } from '@/lib/api/student-portal';
import { describeApiError } from '@/lib/api';
import { buildYouTubeEmbedUrl, clipDurationSeconds } from '@/lib/youtube';
import { cn, formatRelative, formatSecondsToClock } from '@/lib/utils';
import type { FeedItem, RatingRequest } from '@/lib/types';

interface ClipCardProps {
  item: FeedItem;
}

/**
 * THE wedge UI — every other surface exists to lead here.
 *
 * Behavior:
 *   - YouTube iframe at exact (start, end) timestamps. autoplay-OFF,
 *     controls-ON, modestbranding-ON.
 *   - Rating stars 1-5 — POST /api/student/feed/{id}/rate.
 *   - Watched-duration tracking via YouTube IFrame API postMessage. When the
 *     student crosses ≥80% of the clip duration (or rates ≥4) we PATCH
 *     /viewed exactly once. Backend handles fight_studies auto-promotion.
 *
 * We deliberately listen to YT player events via window.postMessage rather
 * than loading the full IFrame API SDK — keeps the bundle lean. The iframe
 * URL has enablejsapi=1 so postMessage works.
 */
export function ClipCard({ item }: ClipCardProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [submittingRating, setSubmittingRating] = useState(false);
  const viewedFiredRef = useRef(false);
  const watchedSecondsRef = useRef(0);
  const lastPlayheadRef = useRef<number | null>(null);
  const playingRef = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const youtubeId = item.fight.youtube_id ?? '';
  const duration = clipDurationSeconds(
    item.timestamp_start_seconds,
    item.timestamp_end_seconds,
  );

  const embedSrc = useMemo(
    () =>
      buildYouTubeEmbedUrl(
        youtubeId,
        item.timestamp_start_seconds,
        item.timestamp_end_seconds,
      ),
    [youtubeId, item.timestamp_start_seconds, item.timestamp_end_seconds],
  );

  /**
   * Mark viewed — fired once per card lifetime.
   */
  async function markViewed(reason: 'watched' | 'rated_high') {
    if (viewedFiredRef.current) return;
    viewedFiredRef.current = true;
    try {
      const seconds =
        reason === 'rated_high' && watchedSecondsRef.current === 0
          ? duration
          : Math.round(watchedSecondsRef.current);
      await studentPortalApi.markViewed(item.delivery_id, {
        viewed_duration_seconds: Math.max(0, seconds),
      });
    } catch (err) {
      // Non-fatal. Auto-promotion can also fire on rating ≥4.
      // eslint-disable-next-line no-console
      console.warn('mark viewed failed', describeApiError(err));
    }
  }

  /**
   * Listen to YouTube postMessage. We send `listening` to register, then
   * receive `infoDelivery` events with playerState + currentTime.
   */
  useEffect(() => {
    if (!youtubeId) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    function postToPlayer(message: unknown) {
      iframe?.contentWindow?.postMessage(JSON.stringify(message), '*');
    }

    function register() {
      postToPlayer({
        event: 'listening',
        id: item.delivery_id,
        channel: 'widget',
      });
      // Subscribe to relevant events.
      ['onStateChange', 'onError'].forEach((event) =>
        postToPlayer({
          event: 'command',
          func: 'addEventListener',
          args: [event],
          id: item.delivery_id,
          channel: 'widget',
        }),
      );
    }

    function onMessage(e: MessageEvent) {
      if (typeof e.data !== 'string') return;
      let raw: unknown;
      try {
        raw = JSON.parse(e.data);
      } catch {
        return;
      }
      if (!raw || typeof raw !== 'object') return;
      const payload = raw as { event?: string; info?: unknown };

      // YT sends event:'infoDelivery' with info.playerState + info.currentTime.
      if (payload.event === 'infoDelivery' && payload.info && typeof payload.info === 'object') {
        const info = payload.info as {
          playerState?: number;
          currentTime?: number;
        };
        // playerState: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering
        if (typeof info.playerState === 'number') {
          const wasPlaying = playingRef.current;
          playingRef.current = info.playerState === 1;
          if (info.playerState === 0 && duration > 0) {
            // Treat ended as fully watched.
            watchedSecondsRef.current = Math.max(
              watchedSecondsRef.current,
              duration,
            );
            void markViewed('watched');
          }
          if (!wasPlaying && playingRef.current) {
            lastPlayheadRef.current = info.currentTime ?? null;
          }
          if (wasPlaying && !playingRef.current) {
            lastPlayheadRef.current = info.currentTime ?? null;
          }
        }
        if (
          typeof info.currentTime === 'number' &&
          playingRef.current
        ) {
          const last = lastPlayheadRef.current;
          if (last != null && info.currentTime > last) {
            watchedSecondsRef.current += info.currentTime - last;
          }
          lastPlayheadRef.current = info.currentTime;
          if (
            duration > 0 &&
            watchedSecondsRef.current >= duration * 0.8 &&
            !viewedFiredRef.current
          ) {
            void markViewed('watched');
          }
        }
      }
    }

    window.addEventListener('message', onMessage);
    // Iframe needs a tick to be ready.
    const t = window.setTimeout(register, 800);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener('message', onMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.delivery_id, youtubeId, duration]);

  async function submitRating(value: number) {
    if (submittingRating) return;
    setSubmittingRating(true);
    try {
      const payload: RatingRequest = { rating: value as RatingRequest['rating'] };
      await studentPortalApi.rate(item.delivery_id, payload);
      setRating(value);
      toast.success('Thanks — rating saved.');
      if (value >= 4 && !viewedFiredRef.current) {
        // Backend auto-promotes on rating ≥4 too; we still mark viewed for
        // the moat dataset.
        void markViewed('rated_high');
      }
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setSubmittingRating(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video w-full bg-black">
        {youtubeId ? (
          <iframe
            ref={iframeRef}
            src={embedSrc}
            title={`Clip ${item.delivery_id}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            Clip unavailable.
          </div>
        )}
      </div>

      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {item.technique.display_name ? (
            <Badge variant="secondary">{item.technique.display_name}</Badge>
          ) : null}
          <span>{formatRelative(item.delivered_at)}</span>
          {item.timestamp_start_seconds != null &&
          item.timestamp_end_seconds != null ? (
            <span>
              · {formatSecondsToClock(item.timestamp_start_seconds)}–
              {formatSecondsToClock(item.timestamp_end_seconds)}
            </span>
          ) : null}
        </div>

        <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
          {item.delivery_message}
        </p>

        {item.fight.title ? (
          <div className="text-xs text-muted-foreground">
            {item.fight.title}
            {item.fight.event ? ` · ${item.fight.event}` : ''}
          </div>
        ) : null}

        <div className="flex items-center justify-between border-t border-border pt-4">
          <div
            className="flex items-center gap-1"
            role="radiogroup"
            aria-label="Rate this clip"
          >
            {[1, 2, 3, 4, 5].map((v) => {
              const filled = (hoverRating ?? rating ?? 0) >= v;
              return (
                <Button
                  key={v}
                  type="button"
                  variant="ghost"
                  size="icon"
                  role="radio"
                  aria-checked={rating === v}
                  aria-label={`${v} star${v > 1 ? 's' : ''}`}
                  onMouseEnter={() => setHoverRating(v)}
                  onMouseLeave={() => setHoverRating(null)}
                  onFocus={() => setHoverRating(v)}
                  onBlur={() => setHoverRating(null)}
                  onClick={() => submitRating(v)}
                  disabled={submittingRating}
                >
                  <Star
                    className={cn(
                      'h-5 w-5',
                      filled ? 'fill-primary text-primary' : 'text-muted-foreground',
                    )}
                  />
                </Button>
              );
            })}
          </div>
          {rating ? (
            <span className="text-xs text-muted-foreground">
              You rated {rating}/5
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
