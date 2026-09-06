/**
 * Manifest M4 enforcement — every buyer-facing label flows through config.
 *
 * Brand decision is open per FIGHT_TRAINER.md §12 (P9 blocker, Pete owns).
 * Until then, env vars carry placeholders. NO buyer-facing brand string is
 * hardcoded outside this file.
 */

export const BRAND = {
  name: process.env.NEXT_PUBLIC_BUYER_BRAND_NAME ?? 'FightCoachHQ',
  // Client-facing (fighters). Config-driven per M4 — override via env.
  tagline:
    process.env.NEXT_PUBLIC_BUYER_BRAND_TAGLINE ??
    'Private coaching. Real progress.',
  domain: process.env.NEXT_PUBLIC_BUYER_BRAND_DOMAIN ?? 'fight-trainer.app',
  // Wordmark, served from public/. Path is brand-neutral so the asset can be
  // swapped without renaming; override via env for a CDN-hosted mark.
  logo: process.env.NEXT_PUBLIC_BUYER_BRAND_LOGO ?? '/brand/logo.png',
  // Intrinsic aspect ratio of the wordmark (width / height). Drives layout
  // sizing so the mark never reflows.
  logoAspect: 1200 / 386,
} as const;

export type BrandConfig = typeof BRAND;
