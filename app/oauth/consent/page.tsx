'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentSession } from '@/lib/auth';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { BRAND } from '@/lib/brand';

/**
 * OAuth 2.1 consent screen — Supabase Auth's authorization path.
 *
 * Supabase Auth (the authorization server) redirects here with
 * `?authorization_id=…` after an MCP client (ChatGPT, Claude.ai) starts the
 * authorization-code + PKCE flow. The page:
 *   1. requires a signed-in user (else /auth/login?next=<this url>);
 *   2. loads the request (client name, requested scopes);
 *   3. approves or denies via supabase.auth.oauth.*, then follows the
 *      returned redirect_url back to the client with the code or error.
 *
 * Contract: backend/fightcoach.mcp.md (auth.consent_path). Skill template:
 * ricks-higherdimensional-mcp-machine/templates/nextjs.oauth-consent.page.tsx.
 */

const CONSENT_PATH = '/oauth/consent';

const SCOPE_LABELS: Record<string, string> = {
  openid: 'Confirm who you are',
  email: 'See your email address',
  profile: 'See your name and profile picture',
  phone: 'See your phone number',
  offline_access: 'Stay connected without signing in again',
};

type Details = {
  authorization_id: string;
  redirect_uri: string;
  client: { id: string; name: string; uri?: string | null; logo_uri?: string | null };
  user: { id: string; email: string };
  scope: string;
};

type Phase = 'loading' | 'ready' | 'deciding' | 'error';

function ConsentForm() {
  const router = useRouter();
  const params = useSearchParams();
  const authorizationId = params.get('authorization_id');

  const [phase, setPhase] = useState<Phase>('loading');
  const [details, setDetails] = useState<Details | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authorizationId) {
        setError('This link is missing its authorization id. Start again from the app you are connecting.');
        setPhase('error');
        return;
      }
      const session = await getCurrentSession();
      if (!session) {
        const next = `${CONSENT_PATH}?authorization_id=${encodeURIComponent(authorizationId)}`;
        router.replace(`/auth/login?next=${encodeURIComponent(next)}`);
        return;
      }
      const sb = getSupabaseBrowser();
      const { data, error: err } = await sb.auth.oauth.getAuthorizationDetails(authorizationId);
      if (cancelled) return;
      if (err || !data) {
        setError(err?.message ?? 'Could not load this authorization request.');
        setPhase('error');
        return;
      }
      // Already consented for this client: Supabase answers with only redirect_url.
      if (!('authorization_id' in data)) {
        window.location.assign(data.redirect_url);
        return;
      }
      setDetails(data as Details);
      setPhase('ready');
    })();
    return () => {
      cancelled = true;
    };
  }, [authorizationId, router]);

  async function decide(action: 'approve' | 'deny') {
    if (!authorizationId) return;
    setPhase('deciding');
    const sb = getSupabaseBrowser();
    const { data, error: err } =
      action === 'approve'
        ? await sb.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
        : await sb.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true });
    if (err || !data?.redirect_url) {
      setError(err?.message ?? 'The authorization server did not return a redirect.');
      setPhase('error');
      return;
    }
    window.location.assign(data.redirect_url);
  }

  if (phase === 'loading') {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading authorization request…
        </CardContent>
      </Card>
    );
  }

  if (phase === 'error' || !details) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" aria-hidden />
            Can&apos;t continue
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>{error}</p>
          <Button variant="outline" onClick={() => router.replace('/')}>
            Back to {BRAND.name}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const scopes = details.scope.split(' ').filter(Boolean);
  const busy = phase === 'deciding';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" aria-hidden />
          Connect {details.client.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <p>
          <span className="font-medium">{details.client.name}</span> wants to access your{' '}
          {BRAND.name} account as <span className="font-medium">{details.user.email}</span>.
        </p>
        <div>
          <p className="mb-2 text-muted-foreground">It will be able to:</p>
          <ul className="space-y-1">
            {scopes.map((s) => (
              <li key={s} className="flex items-start gap-2">
                <span aria-hidden>•</span>
                <span>{SCOPE_LABELS[s] ?? s}</span>
              </li>
            ))}
            <li className="flex items-start gap-2">
              <span aria-hidden>•</span>
              <span>Act in {BRAND.name} with the same role and gym access you have.</span>
            </li>
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">
          You will be sent back to {new URL(details.redirect_uri).host}. You can disconnect this
          app later from your account settings.
        </p>
        <div className="flex gap-3">
          <Button className="flex-1" onClick={() => decide('approve')} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : 'Allow'}
          </Button>
          <Button className="flex-1" variant="outline" onClick={() => decide('deny')} disabled={busy}>
            Deny
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OAuthConsentPage() {
  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{BRAND.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Authorize an app to use your account.</p>
      </div>
      <Suspense fallback={null}>
        <ConsentForm />
      </Suspense>
    </>
  );
}
