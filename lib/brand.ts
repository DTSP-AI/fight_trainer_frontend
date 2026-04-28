/**
 * Manifest M4 enforcement — every buyer-facing label flows through config.
 *
 * Brand decision is open per FIGHT_TRAINER.md §12 (P9 blocker, Pete owns).
 * Until then, env vars carry placeholders. NO buyer-facing brand string is
 * hardcoded outside this file.
 */

export const BRAND = {
  name: process.env.NEXT_PUBLIC_BUYER_BRAND_NAME ?? 'Fight Trainer',
  tagline:
    process.env.NEXT_PUBLIC_BUYER_BRAND_TAGLINE ??
    'AI coaching infrastructure for combat sports',
  domain: process.env.NEXT_PUBLIC_BUYER_BRAND_DOMAIN ?? 'fight-trainer.app',
} as const;

export type BrandConfig = typeof BRAND;
