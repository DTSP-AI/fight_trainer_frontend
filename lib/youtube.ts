/**
 * YouTube iframe URL builders + Player API helpers for the Clip Card.
 *
 * The clip card uses a YouTube iframe at the exact (start, end) timestamp.
 * autoplay-OFF, controls-ON, modestbranding-ON.
 *
 * Viewed-duration tracking is best-effort — when the iframe API is loaded,
 * we listen to PLAYING/PAUSED/ENDED state changes and accumulate watched
 * seconds. When the student hits ≥80% (or rates ≥4) we PATCH viewed.
 */

export function buildYouTubeEmbedUrl(
  youtubeId: string,
  startSeconds?: number | null,
  endSeconds?: number | null,
): string {
  const params = new URLSearchParams({
    enablejsapi: '1',
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    controls: '1',
  });
  if (startSeconds != null && Number.isFinite(startSeconds)) {
    params.set('start', String(Math.floor(startSeconds)));
  }
  if (endSeconds != null && Number.isFinite(endSeconds)) {
    params.set('end', String(Math.floor(endSeconds)));
  }
  return `https://www.youtube.com/embed/${encodeURIComponent(youtubeId)}?${params.toString()}`;
}


/**
 * Compute the clip duration in seconds from start/end.
 * Returns 0 when bounds are missing/invalid — guards downstream divisions.
 */
export function clipDurationSeconds(
  startSeconds: number | null | undefined,
  endSeconds: number | null | undefined,
): number {
  if (
    startSeconds == null ||
    endSeconds == null ||
    !Number.isFinite(startSeconds) ||
    !Number.isFinite(endSeconds)
  ) {
    return 0;
  }
  return Math.max(0, endSeconds - startSeconds);
}
