import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

// ESLint 9 requires a flat config, and this repo had none — so `pnpm lint` had
// been failing since the ESLint 9 bump and nothing was being linted.
//
// eslint-config-next 16 exports flat configs directly, so no FlatCompat bridge
// is needed (bridging it through @eslint/eslintrc throws on a circular plugin
// reference).
const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      'public/sw.js', // plain service worker, not part of the app build
      // Authored ahead of the harness; @playwright/test is not installed, so
      // these are also excluded from tsconfig.json until it lands.
      'e2e/**',
      'playwright.config.ts',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
];

export default config;
