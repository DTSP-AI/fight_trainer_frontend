# Fight Trainer frontend — working law

Project rules for this repo. The global rules in `~/.claude/CLAUDE.md` still
apply; these narrow them. Read `README.md` for what the app actually is.

## Stack law

Next.js 16 (App Router) + React 19 + Tailwind, on **Vercel**. Auth and data come
from **Supabase** and from the FastAPI backend on **Railway**.

That list is complete. A need that fits nothing on it is a question for Pete, not
a new vendor. Render appears in Pete's other projects and has leaked into this
one before — it is not part of this stack.

## Gates

**This repo uses pnpm.** `pnpm-lock.yaml` is the lockfile and there is no
`package-lock.json`; running `npm install` here fails with an opaque internal
error. Use `pnpm`.

`pnpm typecheck` (tsc --noEmit) is THE gate, plus `pnpm build`. Both must pass
before a commit.

`pnpm lint` works as of 2026-09-04 (`eslint.config.mjs`, ESLint 9 flat config
using eslint-config-next's native flat exports — do NOT bridge it through
FlatCompat, that throws on a circular plugin reference). It reports 33
pre-existing errors and is therefore NOT yet a blocking gate. Two rules only:
add no NEW violations, and never silence one with `// eslint-disable`.

Playwright specs exist in `e2e/` but `@playwright/test` is not installed, which
is why `playwright.config.ts` carries a `@ts-nocheck`. There is no unit-test
harness. When a change deserves regression coverage, that coverage belongs in
the backend suite or is called out as post-ship work — do not stand up a harness
mid-task.

## Manifest gates this repo carries

- **M2 — voice seam.** `components/trainer/voice-mode-badge.tsx` exists and is
  deliberately NOT mounted; mounting it is WP-01, deferred by Pete until after
  release. Do not delete the component to "clean up dead code" — the seam is the
  point. Do not mount it either without WP-01.
- **M4 — brand.** Every buyer-facing name comes from `lib/brand.ts`. No literal
  product name in a component, a page, or `public/`. `app/manifest.ts` is
  generated for this reason; there is no static `manifest.webmanifest`.
  `public/sw.js` cannot read config, so its fallback strings must stay
  brand-free rather than hardcode a name.

## Sources of truth

- Types in `lib/types.ts` mirror the backend's Pydantic models and row shapes.
  When they drift, fix `lib/types.ts` — never paper over it at the call site.
- Payment identity (Venmo handle, Zelle number) comes from the backend's
  `GET /api/pricing/payment-methods`, which serves the tenant settings row the
  coach edits. Never reintroduce it as a constant or a `NEXT_PUBLIC_*` var; that
  is what made the settings page a lie once already.
- The feed is a discriminated union: `type: 'clip'` renders `ClipCard`,
  `type: 'notice'` renders `NoticeCard`. A notice has no fight and no technique,
  so it must never reach `ClipCard`.

## Scope discipline

Declare files before editing them, touch only what the task names, and report
anything else you notice instead of fixing it. Work on `active-dev`; never push
to `main`. Commit author must be `combatperformfit@gmail.com` — verify with
`git config user.email` before every commit.
