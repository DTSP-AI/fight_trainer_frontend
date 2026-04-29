'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Trophy,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/common/loading-state';
import { EmptyState } from '@/components/common/empty-state';
import {
  fightersApi,
  type FighterDetailResponse,
  type FighterMessage,
} from '@/lib/api/fighters';
import { describeApiError } from '@/lib/api';

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

export default function FighterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const fighterId = String(params?.id ?? '');

  const [data, setData] = useState<FighterDetailResponse | null>(null);
  const [messages, setMessages] = useState<FighterMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [d, m] = await Promise.all([
        fightersApi.get(fighterId),
        fightersApi.messages(fighterId),
      ]);
      setData(d);
      setMessages(m);
    } catch (err) {
      setError(describeApiError(err));
    }
  }, [fighterId]);

  useEffect(() => {
    if (!fighterId) return;
    void refresh();
  }, [fighterId, refresh]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  async function send() {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    try {
      const res = await fightersApi.chat(fighterId, text);
      setMessages((prev) => [...prev, res.user, res.assistant]);
      setDraft('');
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setSending(false);
    }
  }

  async function refreshNews() {
    setRefreshing(true);
    try {
      const res = await fightersApi.refresh(fighterId, true);
      toast.success('News refreshed');
      if (data) {
        setData({
          ...data,
          fighter: {
            ...data.fighter,
            current_events_summary: res.current_events_summary,
            last_searched_at: new Date().toISOString(),
          },
        });
      }
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setRefreshing(false);
    }
  }

  async function deleteFighter() {
    const name = data?.fighter.name ?? 'this fighter';
    if (!window.confirm(`Remove ${name} from the bank? Past analyses stay; only the bank entry + chat history are deleted.`)) {
      return;
    }
    setDeleting(true);
    try {
      await fightersApi.delete(fighterId);
      toast.success(`${name} removed`);
      router.push('/trainer/fighters');
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setDeleting(false);
    }
  }

  if (error) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        {error}
      </p>
    );
  }
  if (!data) return <LoadingState label="Loading fighter…" />;

  const f = data.fighter;
  const analyses = data.analyses ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/trainer/fighters">
          <ArrowLeft className="h-4 w-4" />
          Back to fighter bank
        </Link>
      </Button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
            <Trophy className="h-6 w-6 text-amber-300" />
            {f.name}
          </h1>
          {f.nickname ? (
            <p className="mt-1 text-sm italic text-muted-foreground">
              "{f.nickname}"
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {f.discipline ? (
              <Badge variant="outline" className="capitalize">
                {f.discipline.replace('_', ' ')}
              </Badge>
            ) : null}
            {f.weight_class ? (
              <Badge variant="outline">{f.weight_class}</Badge>
            ) : null}
            <span className="text-muted-foreground">
              {analyses.length} fight{analyses.length === 1 ? '' : 's'} on file
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={refreshing}
            onClick={refreshNews}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
            />
            {refreshing ? 'Searching…' : 'Refresh news'}
          </Button>
          <Button
            variant="ghost"
            disabled={deleting}
            onClick={deleteFighter}
            className="text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </Button>
        </div>
      </div>

      {/* News block */}
      {f.current_events_summary ? (
        <Card className="border-violet-500/40 bg-violet-500/5">
          <CardContent className="space-y-2 py-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-violet-200">
              <Sparkles className="h-3 w-3" />
              Recent news · {fmtDate(f.last_searched_at)}
            </div>
            <p className="whitespace-pre-wrap text-sm">
              {f.current_events_summary}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">
            No recent news cached. Click <strong>Refresh news</strong> to pull
            a current-events summary via web search.
          </CardContent>
        </Card>
      )}

      {/* Past analyses */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Fights on file
        </h2>
        {analyses.length === 0 ? (
          <EmptyState
            title="No analyses yet"
            description="Run an analysis that includes this fighter and it'll appear here."
          />
        ) : (
          <div className="space-y-2">
            {analyses.map((a, i) => {
              const fa = a.fight_analyses;
              if (!fa) return null;
              const vfd = fa.verified_fight_data ?? {};
              const opp =
                vfd.fighter_a && vfd.fighter_b
                  ? vfd.fighter_a
                      ?.toLowerCase()
                      .includes(f.name.toLowerCase())
                    ? vfd.fighter_b
                    : vfd.fighter_a
                  : null;
              return (
                <Link
                  key={`${fa.id}-${i}`}
                  href={`/trainer/analyze/${fa.id}`}
                  className="block"
                >
                  <Card className="transition-colors hover:border-primary/50">
                    <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                      <div>
                        <div className="font-semibold">
                          {opp ? `vs ${opp}` : 'fight'}
                          {vfd.fight_year ? ` · ${vfd.fight_year}` : ''}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {vfd.event ?? fa.youtube_url ?? '(unknown)'}
                          {vfd.winner ? ` · winner: ${vfd.winner}` : ''}
                          {vfd.method ? ` · ${vfd.method}` : ''}
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {fa.status?.replace('_', ' ') ?? 'unknown'}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Chat */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Chat
        </h2>
        <Card>
          <CardContent className="space-y-3 py-4">
            <div
              ref={scrollRef}
              className="max-h-[400px] space-y-3 overflow-y-auto pr-2"
            >
              {messages.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Ask anything about {f.name} — their style, recent form,
                  matchups, how to train against them. Answers ground in the
                  analyses on file plus the news block above.
                </p>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={
                      m.sender === 'user'
                        ? 'ml-auto max-w-[85%] rounded-md bg-primary/10 p-3 text-sm'
                        : 'max-w-[85%] rounded-md border border-border bg-background/40 p-3 text-sm'
                    }
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2 border-t border-border pt-3">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder={`Ask about ${f.name}…`}
                disabled={sending}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <Button onClick={send} disabled={sending || !draft.trim()}>
                <Send className="h-4 w-4" />
                {sending ? '…' : 'Send'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
