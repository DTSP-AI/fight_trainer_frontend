'use client';

import { createBrowserClient } from '@supabase/ssr';

let _client: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Returns a singleton Supabase browser client.
 * Reads NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY.
 *
 * Throws if env vars are missing — callers should be wrapped in error
 * boundaries during dev. In production these MUST be set at build time.
 */
export function getSupabaseBrowser() {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase env not configured: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.',
    );
  }
  _client = createBrowserClient(url, key);
  return _client;
}
