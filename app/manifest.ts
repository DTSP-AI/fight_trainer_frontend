import type { MetadataRoute } from 'next';
import { BRAND } from '@/lib/brand';

/**
 * M4 — the PWA install name is buyer-facing, so it cannot be a static JSON
 * literal. Next generates this at /manifest.webmanifest, which is what
 * app/layout.tsx already links.
 *
 * Verified against Next.js docs v16.3.4 (2026-09-04):
 * https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest
 *
 * BRAND reads NEXT_PUBLIC_* vars, which Next inlines at build time, so this
 * route stays statically cached — no request-time API is used.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.name,
    short_name: BRAND.name,
    description:
      'Track training sessions, progress and skills with AI-powered breakdowns of real fights.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f0f0f',
    theme_color: '#0f0f0f',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
