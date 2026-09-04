# Fight Trainer — frontend

Next.js 16 (App Router) + React 19 + Tailwind, deployed on Vercel. Talks to the
FastAPI backend (`fight_trainer_backend`, Railway) and to Supabase for auth.

Every statement below is taken from the code and cites the file. If something
here disagrees with the code, the code is right and this file is a bug.

## Run

```bash
npm install
cp .env.local.example .env.local     # fill NEXT_PUBLIC_API_URL + Supabase keys
npm run dev                          # http://localhost:3000

npm run typecheck                    # tsc --noEmit — THE gate
npm run build                        # production build
```

`npm run lint` currently fails: ESLint 9 needs `eslint.config.js` and the repo
still has none, so `tsc --noEmit` plus `next build` are the real static gates.

## Routes

```
/                       marketing home        /pricing, /about, /privacy, /terms
/auth/login             coach password login  /auth/signup, /auth/signup/coach
/auth/forgot            password reset        /auth/reset-password
/auth/student/accept    invite claim (student Google OAuth binds here)
/invoice/[token]        PUBLIC tokenized invoice + Stripe checkout — no auth

/trainer                dashboard             /trainer/sessions, /sessions/new, /sessions/[id]
                                              /trainer/students, /students/[id], /students/[id]/billing
                                              /trainer/schedule, /plans, /library, /inactivity, /graph
                                              /trainer/billing
                                              /trainer/analyze, /analyze/[id], /fighters, /fighters/[id]
                                              /trainer/settings/payments, /settings/integrations
/student                dashboard             /student/feed, /sessions, /schedule, /plan
                                              /student/profile, /intake, /graph, /analyzer
/dtsp-admin             admin                 /dtsp-admin/library, /dtsp-admin/import
```

## Auth

Supabase Auth, ES256/JWKS — the backend verifies the same JWT.

- **Coach:** email + password (`/auth/login`).
- **Student:** the coach sends an invite; the student lands on
  `/auth/student/accept` and signs in with Google, which binds that identity to
  their existing student row.
- Role comes from the verified `app_metadata.user_role` claim, never from an
  email allowlist.

Three guard layers, in order:

1. `middleware.ts` — edge gate. `/trainer/*`, `/student/*`, `/dtsp-admin/*` each
   require the matching role; a signed-in user with the wrong role is redirected
   to their own root rather than shown a 403.
2. `<RoleGate role="…">` in `app/trainer/layout.tsx` and `app/student/layout.tsx`
   — client-side, so a soft navigation cannot slip past the edge.
3. The backend re-validates the JWT on every request. The first two layers are
   UX and defence in depth; the backend is the actual authority.

## Environment

All client-visible, all `NEXT_PUBLIC_*` (see `.env.local.example`):

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | FastAPI base URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable key (`sb_publishable_*`) — never the legacy anon JWT |
| `NEXT_PUBLIC_BUYER_BRAND_NAME` / `_TAGLINE` / `_DOMAIN` | M4 brand, read only via `lib/brand.ts` |
| `NEXT_PUBLIC_PAYMENTS_PROVIDER` | `venmo` (default) or `stripe`, read at `lib/payments.ts` |

The Venmo/Zelle **identity** is deliberately not here: it comes from the tenant
settings row via `GET /api/pricing/payment-methods`, so the coach's settings
page is the single source of truth (`lib/api/pricing.ts`).

## Testing

There is **no e2e or unit harness installed** in this repo — no Playwright, no
Jest, no Vitest. Verification is `tsc --noEmit`, `next build`, and manual
browser smoke. Adding a harness is post-ship work.
