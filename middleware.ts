import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Path-based auth gate per CONCEPT_BRIEF §8 (auth + role enforcement at the
 * edge). Backend FastAPI re-validates the JWT — middleware is the first line
 * of defence + UX redirect.
 *
 *  /trainer/*    → trainer
 *  /student/*    → student
 *  /dtsp-admin/* → dtsp_admin
 *
 * Public: /, /(marketing), /auth/*, /pricing, /about
 */

const ROLE_GATES: { prefix: string; role: 'trainer' | 'student' | 'dtsp_admin' }[] = [
  { prefix: '/trainer', role: 'trainer' },
  { prefix: '/student', role: 'student' },
  { prefix: '/dtsp-admin', role: 'dtsp_admin' },
];

const ROLE_ROOT: Record<string, string> = {
  trainer: '/trainer',
  student: '/student',
  dtsp_admin: '/dtsp-admin',
};

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const path = url.pathname;

  // Static assets, _next, favicon — bypass.
  if (
    path.startsWith('/_next') ||
    path.startsWith('/favicon') ||
    path.startsWith('/api') ||
    path.includes('.')
  ) {
    return NextResponse.next();
  }

  const gate = ROLE_GATES.find((g) => path.startsWith(g.prefix));
  if (!gate) return NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    // Without env, can't verify — send to login. Visible failure.
    url.pathname = '/auth/login';
    url.searchParams.set('reason', 'supabase_not_configured');
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next({ request: req });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    url.pathname = '/auth/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  const meta = (user.app_metadata ?? {}) as Record<string, unknown>;
  const role = (meta['user_role'] ?? meta['role']) as string | undefined;

  if (role !== gate.role) {
    if (role && role in ROLE_ROOT) {
      url.pathname = ROLE_ROOT[role] ?? '/';
    } else {
      url.pathname = '/auth/login';
      url.searchParams.set('reason', 'role_mismatch');
    }
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
