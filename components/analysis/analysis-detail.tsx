'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { LoadingState } from '@/components/common/loading-state';
import {
  analyzeApi,
  CONTENT_TYPE_LABEL,
  type AnalysisFull,
  type ChatMessage,
} from '@/lib/api/analyze';
import { describeApiError } from '@/lib/api';

// ============================================================================
// Report shapes — mirror backend/app/models/analysis.py
// ============================================================================

interface FighterInfo {
  name: string;
  stance?: 'orthodox' | 'southpaw' | 'switch' | 'unknown' | null;
  notes?: string | null;
}

interface KeyMoment {
  timestamp_sec: number;
  description: string;
  significance: string;
  tags?: string[];
}

interface PatternObservation {
  pattern: string;
  frequency: string;
  timestamps?: number[];
  coaching_note: string;
}

interface RoundBreakdown {
  round_num: number;
  key_moments: KeyMoment[];
  dominant_fighter?: string | null;
  summary: string;
}

interface TimestampedClip {
  t0: number;
  t1: number;
  label: string;
  coaching_note: string;
  priority: number; // 1-5, 1=highest
}

interface Drill {
  name: string;
  description: string;
  duration_minutes: number;
  focus: string;
}

interface TrainingRecommendation {
  theme: string;
  drills: Drill[];
  sparring_constraints: string[];
  notes: string;
}

interface FightQuality {
  entertainment_rating: number;
  action_level: string;
  would_rewatch: boolean;
  honest_take: string;
}

interface FightReport {
  analysis_id: string;
  video_id: string;
  generated_at?: string;
  fighter_a?: FighterInfo | null;
  fighter_b?: FighterInfo | null;
  summary: string;
  fighter_a_assessment?: string[] | null;
  fighter_b_assessment?: string[] | null;
  coaching_insights?: string | null;
  fight_quality?: FightQuality | null;
  stance_and_positioning: PatternObservation[];
  defense_patterns: PatternObservation[];
  offense_patterns: PatternObservation[];
  range_management: PatternObservation[];
  tells_and_timing: PatternObservation[];
  round_by_round: RoundBreakdown[];
  timestamped_clips: TimestampedClip[];
  training_plan: TrainingRecommendation[];
  event?: string | null;
  matchup_number?: number | null;
  total_duration_sec?: number;
  frames_analyzed?: number;
  transcript_available?: boolean;
  personalized_for_student?: string | null;
}

interface InstructionalSection {
  title: string;
  timestamp_sec: number;
  summary: string;
  key_points: string[];
  techniques: string[];
}

interface InstructionalReport {
  analysis_id: string;
  video_id: string;
  content_type: 'instructional';
  title?: string | null;
  instructor?: string | null;
  topic: string;
  lead: string;
  sections: InstructionalSection[];
  techniques_covered: string[];
  key_takeaways: string[];
  common_mistakes: string[];
  timestamped_clips: TimestampedClip[];
  training_plan: TrainingRecommendation[];
  coaching_insights?: string | null;
  total_duration_sec?: number;
  transcript_available?: boolean;
  personalized_for_student?: string | null;
}

function fmtTs(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function ytAt(videoId: string | null, sec: number): string | null {
  return videoId
    ? `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(sec)}s`
    : null;
}

// Mirrors the milestones written in backend/app/graph/analysis_graph.py.
// Fallback only — `current_step` is persisted and preferred when present.
function deriveStepLabel(
  status: string,
  pct: number,
  instructional: boolean,
): string {
  if (status === 'failed') return 'Pipeline failed';
  if (status === 'completed' || pct >= 100) return 'Complete';
  if (pct < 15) return 'Queued';
  if (pct < 30) return 'Fetching YouTube info & transcript';
  if (instructional) {
    if (pct < 50) return 'Reading the lesson';
    if (pct < 80) return 'Building the study guide';
    return 'Finishing up';
  }
  if (pct < 35) return 'Identifying fighters';
  if (pct < 45) return 'Verifying fight against Wikipedia & Sherdog';
  if (pct < 50) return 'Verification complete';
  if (pct < 80) return 'Building the breakdown';
  if (pct < 90) return 'Validating against transcript';
  if (pct < 100) return 'Refining the report';
  return 'Complete';
}

function ProgressBar({ pct, status }: { pct: number; status: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const failed = status === 'failed';
  const done = status === 'completed' || clamped >= 100;
  const barColor = failed
    ? 'bg-destructive'
    : done
      ? 'bg-emerald-500'
      : 'bg-primary';
  const animated = !done && !failed;
  return (
    <div
      className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-out ${barColor}`}
        style={{ width: `${clamped}%` }}
      />
      {animated ? (
        <div className="pointer-events-none absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      ) : null}
    </div>
  );
}

function priorityClass(p: number): string {
  if (p <= 1) return 'border-primary text-primary glow-ring';
  if (p === 2) return 'border-primary/70 text-foreground';
  if (p === 3) return 'border-border text-foreground';
  return 'border-border text-muted-foreground';
}

// ============================================================================
// Detail view — shared by /trainer/analyze/[id] and /student/analyzer/[id]
// ============================================================================

export function AnalysisDetail({
  analysisId,
  backHref,
}: {
  analysisId: string;
  backHref: string;
}) {
  const id = analysisId;
  const [data, setData] = useState<AnalysisFull | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchOnce = useCallback(async () => {
    try {
      const res = await analyzeApi.get(id);
      setData(res);
      return res;
    } catch (err) {
      setError(describeApiError(err));
      return null;
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      await fetchOnce();
    })();
  }, [id, fetchOnce]);

  // Poll while pipeline still running
  useEffect(() => {
    if (!data) return;
    const terminal = data.status === 'completed' || data.status === 'failed';
    if (terminal) {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }
    if (pollRef.current) return;
    pollRef.current = setInterval(() => {
      void fetchOnce();
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [data, fetchOnce]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      </div>
    );
  }
  if (!data) return <LoadingState label="Loading analysis…" />;

  const instructional = data.content_type === 'instructional';
  const report = (data.report ?? null) as
    | FightReport
    | InstructionalReport
    | null;
  const lens = data.student_lens as { student_full_name?: string } | null;
  const progressPct = data.progress_pct ?? data.progress_percent ?? 0;
  const currentStep =
    data.current_step ?? deriveStepLabel(data.status, progressPct, instructional);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {CONTENT_TYPE_LABEL[data.content_type ?? 'full_fight']}
          </Badge>
          <Badge
            variant={
              data.status === 'completed'
                ? 'default'
                : data.status === 'failed'
                  ? 'destructive'
                  : 'secondary'
            }
          >
            {data.status.replace('_', ' ')} · {progressPct}%
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-card">
          {data.youtube_video_id ? (
            <iframe
              className="h-full w-full"
              src={`https://www.youtube.com/embed/${data.youtube_video_id}`}
              title={instructional ? 'Analyzed video' : 'Analyzed fight'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No video id yet
            </div>
          )}
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-medium capitalize">
                  {data.status.replace('_', ' ')}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {progressPct}%
                </span>
              </div>
              <ProgressBar pct={progressPct} status={data.status} />
              {currentStep ? (
                <div className="mt-1.5 text-xs text-muted-foreground">
                  {currentStep}
                </div>
              ) : null}
            </div>
            {data.sport ? (
              <div className="flex justify-between">
                <span>Sport</span>
                <span>{data.sport}</span>
              </div>
            ) : null}
            {lens?.student_full_name ? (
              <div className="flex justify-between">
                <span>Lensed for</span>
                <span>{lens.student_full_name}</span>
              </div>
            ) : null}
            {data.error_detail ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                {data.error_detail}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {!report ? (
        <Card>
          <CardContent className="space-y-4 py-8">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold capitalize">
                  {data.status === 'failed' ? 'Pipeline failed' : currentStep}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {progressPct}%
                </span>
              </div>
              <ProgressBar pct={progressPct} status={data.status} />
            </div>
            {data.status !== 'failed' ? (
              <p className="text-xs text-muted-foreground">
                The breakdown will render here as soon as the analyst finishes.
                You can leave this tab open — it polls every three seconds.
              </p>
            ) : data.error_detail ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                {data.error_detail}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : instructional ? (
        <InstructionalReportView
          report={report as InstructionalReport}
          videoId={data.youtube_video_id}
        />
      ) : (
        <FightReportView
          report={report as FightReport}
          videoId={data.youtube_video_id}
        />
      )}

      {report && data.status === 'completed' ? (
        <ChatPanel analysisId={data.id} instructional={instructional} />
      ) : null}
    </div>
  );
}

// ============================================================================
// Instructional report
// ============================================================================

function InstructionalReportView({
  report,
  videoId,
}: {
  report: InstructionalReport;
  videoId: string | null;
}) {
  return (
    <div className="space-y-6">
      <Card className="surface-3d-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <BookOpen className="h-5 w-5 text-primary" />
            {report.title || report.topic || 'Instructional breakdown'}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {report.instructor ? `${report.instructor} · ` : ''}
            {report.topic}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {report.personalized_for_student ? (
            <Badge variant="outline">
              Personalized for {report.personalized_for_student}
            </Badge>
          ) : null}
          {/* The lead blurb */}
          <p className="text-lg leading-relaxed">{report.lead}</p>
          {report.techniques_covered?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {report.techniques_covered.map((t, i) => (
                <span
                  key={i}
                  className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {report.sections?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>What&apos;s in the video</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.sections.map((s, i) => {
              const href = ytAt(videoId, s.timestamp_sec);
              return (
                <div
                  key={i}
                  className="rounded-md border border-border bg-card/60 p-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-2">
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-sm text-primary underline-offset-2 hover:underline"
                        >
                          {fmtTs(s.timestamp_sec)}
                        </a>
                      ) : (
                        <span className="font-mono text-sm text-primary">
                          {fmtTs(s.timestamp_sec)}
                        </span>
                      )}
                      <span className="text-sm font-semibold">{s.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Part {i + 1}
                    </span>
                  </div>
                  {s.summary ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {s.summary}
                    </p>
                  ) : null}
                  {s.key_points?.length ? (
                    <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm">
                      {s.key_points.map((k, j) => (
                        <li key={j}>{k}</li>
                      ))}
                    </ul>
                  ) : null}
                  {s.techniques?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {s.techniques.map((t, j) => (
                        <span
                          key={j}
                          className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        {report.key_takeaways?.length ? (
          <Card className="glow-ring">
            <CardHeader>
              <CardTitle>Key takeaways</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm">
                {report.key_takeaways.map((t, i) => (
                  <li key={i}>• {t}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
        {report.common_mistakes?.length ? (
          <Card>
            <CardHeader>
              <CardTitle>Common mistakes</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {report.common_mistakes.map((t, i) => (
                  <li key={i}>• {t}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {report.timestamped_clips?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Rewind to these</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.timestamped_clips.map((c, i) => (
              <ClipRow key={i} clip={c} videoId={videoId} />
            ))}
          </CardContent>
        </Card>
      ) : null}

      <TrainingPlanCard
        plan={report.training_plan}
        personalizedFor={report.personalized_for_student}
      />

      {report.coaching_insights ? (
        <Card>
          <CardHeader>
            <CardTitle>Coaching insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-invert max-w-none whitespace-pre-line text-base leading-relaxed">
              {report.coaching_insights}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

// ============================================================================
// Fight report (unchanged shape)
// ============================================================================

function FightReportView({
  report,
  videoId,
}: {
  report: FightReport;
  videoId: string | null;
}) {
  const aName = report.fighter_a?.name ?? 'Fighter';
  const bName = report.fighter_b?.name ?? 'Opponent';
  return (
    <div className="space-y-6">
      <Card className="surface-3d-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-5 w-5 text-primary" />
            {aName} vs {bName}
          </CardTitle>
          {report.event ? (
            <p className="text-sm text-muted-foreground">{report.event}</p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {report.personalized_for_student ? (
            <Badge variant="outline">
              Personalized for {report.personalized_for_student}
            </Badge>
          ) : null}
          <div className="prose prose-invert max-w-none whitespace-pre-line text-base leading-relaxed">
            {report.summary}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FighterCard name={aName} bullets={report.fighter_a_assessment ?? []} />
            <FighterCard name={bName} bullets={report.fighter_b_assessment ?? []} />
          </div>
          {report.fight_quality ? (
            <FightQualityCard q={report.fight_quality} />
          ) : null}
        </CardContent>
      </Card>

      <PatternBlock title="Stance & positioning" items={report.stance_and_positioning} />
      <PatternBlock title="Defense patterns" items={report.defense_patterns} />
      <PatternBlock title="Offense patterns" items={report.offense_patterns} />
      <PatternBlock title="Range management" items={report.range_management} />
      <PatternBlock
        title="Tells & timing — gold for coaches"
        items={report.tells_and_timing}
        highlight
      />

      {report.round_by_round?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Round by round</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.round_by_round.map((r) => (
              <div
                key={r.round_num}
                className="rounded-md border border-border bg-card/60 p-4"
              >
                <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
                  <span>Round {r.round_num}</span>
                  {r.dominant_fighter ? (
                    <Badge variant="outline" className="text-xs">
                      Dominant: {r.dominant_fighter}
                    </Badge>
                  ) : null}
                </div>
                <p className="mb-3 text-sm text-muted-foreground">{r.summary}</p>
                <ul className="space-y-2 text-sm">
                  {r.key_moments.map((m, i) => (
                    <li key={i} className="space-y-0.5">
                      <div className="flex gap-2">
                        <span className="font-mono text-primary">
                          {fmtTs(m.timestamp_sec)}
                        </span>
                        <span className="font-medium">{m.description}</span>
                      </div>
                      {m.significance ? (
                        <p className="pl-12 text-xs text-muted-foreground">
                          {m.significance}
                        </p>
                      ) : null}
                      {m.tags?.length ? (
                        <div className="flex flex-wrap gap-1 pl-12">
                          {m.tags.map((t, ti) => (
                            <span
                              key={ti}
                              className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Timestamped clips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {report.timestamped_clips.map((c, i) => (
            <ClipRow key={i} clip={c} videoId={videoId} />
          ))}
        </CardContent>
      </Card>

      <TrainingPlanCard
        plan={report.training_plan}
        personalizedFor={report.personalized_for_student}
      />

      {report.coaching_insights ? (
        <Card>
          <CardHeader>
            <CardTitle>Coaching insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-invert max-w-none whitespace-pre-line text-base leading-relaxed">
              {report.coaching_insights}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

// ============================================================================
// Shared pieces
// ============================================================================

function TrainingPlanCard({
  plan,
  personalizedFor,
}: {
  plan: TrainingRecommendation[];
  personalizedFor?: string | null;
}) {
  if (!plan?.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Training plan
          {personalizedFor ? ` — ${personalizedFor}` : ''}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {plan.map((t, i) => (
          <div key={i} className="rounded-md border border-border bg-card/60 p-4">
            <div className="text-sm font-semibold">{t.theme}</div>
            {t.notes ? (
              <p className="mt-1 text-sm text-muted-foreground">{t.notes}</p>
            ) : null}
            {t.drills.length ? (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {t.drills.map((d, j) => (
                  <div
                    key={j}
                    className="rounded-md border border-border bg-background/40 p-3 text-xs"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="font-semibold text-foreground">{d.name}</div>
                      <span className="font-mono text-muted-foreground">
                        {d.duration_minutes}m
                      </span>
                    </div>
                    {d.focus ? (
                      <div className="mt-0.5 text-[11px] uppercase tracking-wider text-primary">
                        {d.focus}
                      </div>
                    ) : null}
                    {d.description ? (
                      <p className="mt-1 text-muted-foreground">{d.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
            {t.sparring_constraints?.length ? (
              <div className="mt-3 space-y-1">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Sparring constraints
                </div>
                <ul className="list-disc pl-5 text-xs">
                  {t.sparring_constraints.map((sc, k) => (
                    <li key={k}>{sc}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function FighterCard({ name, bullets }: { name: string; bullets: string[] }) {
  return (
    <div className="rounded-md border border-border bg-card/60 p-4">
      <div className="mb-2 text-sm font-semibold">{name}</div>
      <ul className="space-y-1 text-sm">
        {bullets.map((b, i) => (
          <li key={i}>• {b}</li>
        ))}
      </ul>
    </div>
  );
}

function FightQualityCard({ q }: { q: FightQuality }) {
  return (
    <div className="rounded-md border border-border bg-card/60 p-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Badge>{q.entertainment_rating}/10</Badge>
        <span className="capitalize">{q.action_level}</span>
        <span className="text-muted-foreground">·</span>
        <span>{q.would_rewatch ? 'Rewatch worthy' : 'One and done'}</span>
      </div>
      <p className="mt-2 text-sm italic text-muted-foreground">{q.honest_take}</p>
    </div>
  );
}

function PatternBlock({
  title,
  items,
  highlight,
}: {
  title: string;
  items: PatternObservation[];
  highlight?: boolean;
}) {
  if (!items?.length) return null;
  return (
    <Card className={highlight ? 'glow-ring' : undefined}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((p, i) => (
          <div key={i} className="rounded-md border border-border bg-card/60 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-sm font-semibold">{p.pattern}</div>
              {p.frequency ? (
                <span className="text-xs text-muted-foreground">{p.frequency}</span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{p.coaching_note}</p>
            {p.timestamps?.length ? (
              <div className="mt-2 flex flex-wrap gap-1 text-xs">
                {p.timestamps.map((t, j) => (
                  <span
                    key={j}
                    className="rounded border border-border bg-background px-2 py-0.5 font-mono"
                  >
                    {fmtTs(t)}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ClipRow({
  clip,
  videoId,
}: {
  clip: TimestampedClip;
  videoId: string | null;
}) {
  const href = ytAt(videoId, clip.t0);
  return (
    <div
      className={`flex items-start gap-3 rounded-md border bg-card/60 p-3 ${priorityClass(clip.priority)}`}
    >
      <div className="font-mono text-xs">
        {fmtTs(clip.t0)}–{fmtTs(clip.t1)}
      </div>
      <span className="rounded border border-current px-1.5 py-0.5 text-[10px] font-bold">
        P{clip.priority}
      </span>
      <div className="flex-1">
        <div className="text-sm font-semibold">{clip.label}</div>
        <p className="text-xs text-muted-foreground">{clip.coaching_note}</p>
      </div>
      {href ? (
        <Button asChild variant="outline" size="sm">
          <a href={href} target="_blank" rel="noreferrer">
            Open
          </a>
        </Button>
      ) : null}
    </div>
  );
}

function ChatPanel({
  analysisId,
  instructional,
}: {
  analysisId: string;
  instructional: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    analyzeApi
      .messages(analysisId)
      .then((m) => {
        if (!cancelled) setMessages(m);
      })
      .catch(() => {
        /* history unavailable — chat still works */
      });
    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  async function send() {
    const text = input.trim();
    if (!text) return;
    setBusy(true);
    setInput('');
    setMessages((prev) => [
      ...prev,
      { id: `tmp-${Date.now()}`, role: 'user', content: text },
    ]);
    try {
      const res = await analyzeApi.chat(analysisId, text);
      setMessages((prev) => [...prev, res.message]);
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {instructional ? 'Discuss this lesson' : 'Ask follow-up'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-h-96 space-y-3 overflow-y-auto pr-2">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {instructional
                ? 'Ask about a section, a technique detail, or how to drill it this week.'
                : 'Ask about a specific moment, technique, or what to drill next.'}
            </p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === 'user'
                    ? 'rounded-md bg-secondary/60 p-3 text-sm'
                    : 'rounded-md border border-border bg-card/80 p-3 text-sm whitespace-pre-line'
                }
              >
                {m.content}
              </div>
            ))
          )}
        </div>
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              instructional
                ? 'Ask about the grip at 3:42, or how to drill this…'
                : 'Ask about 3:42, or what to drill from this fight…'
            }
            rows={2}
            disabled={busy}
          />
          <Button onClick={send} disabled={busy || !input.trim()} size="lg">
            {busy ? '…' : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
