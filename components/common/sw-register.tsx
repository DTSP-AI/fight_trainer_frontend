'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker once on mount. Rendered from the root layout —
 * no UI. Push subscription itself is opt-in via <PushToggle />.
 */
export function SwRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => console.warn('[sw] registration failed', err));
  }, []);
  return null;
}
