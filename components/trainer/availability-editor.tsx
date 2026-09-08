'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarOff, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingState } from '@/components/common/loading-state';
import {
  availabilityApi,
  type AvailabilityBlock,
  type AvailabilityRule,
} from '@/lib/api/calendar';
import { describeApiError } from '@/lib/api';

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

// The zones a US coach actually operates in. The tenant's current zone is
// appended when it isn't one of these, so nothing is ever silently dropped.
const COMMON_ZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
];

const SLOT_LENGTHS = [30, 45, 60, 75, 90, 120];

/** Postgres hands back "HH:MM:SS"; <input type="time"> wants "HH:MM". */
function toTimeInput(v: string): string {
  return v.slice(0, 5);
}

function fmtBlockWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/** Local datetime for a <input type="datetime-local"> value. */
function toLocalInput(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export function AvailabilityEditor({ onChanged }: { onChanged?: () => void }) {
  const [timezone, setTimezone] = useState<string | null>(null);
  const [rules, setRules] = useState<AvailabilityRule[] | null>(null);
  const [blocks, setBlocks] = useState<AvailabilityBlock[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // add-rule form
  const [ruleDay, setRuleDay] = useState('1');
  const [ruleStart, setRuleStart] = useState('17:00');
  const [ruleEnd, setRuleEnd] = useState('20:00');
  const [ruleSlot, setRuleSlot] = useState('60');

  // add-block form
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState('');

  const refresh = useCallback(async () => {
    try {
      const now = new Date();
      const to = new Date(now);
      to.setDate(to.getDate() + 62);
      const [settings, rs, bs] = await Promise.all([
        availabilityApi.settings(),
        availabilityApi.rules(),
        availabilityApi.blocks({
          from_date: now.toISOString(),
          to_date: to.toISOString(),
        }),
      ]);
      setTimezone(settings.timezone);
      setRules(rs);
      setBlocks(bs);
      setError(null);
    } catch (err) {
      setError(describeApiError(err));
    }
  }, []);

  useEffect(() => {
    // Wrapped so the loader's setState calls land in a promise callback
    // rather than synchronously in the effect body.
    void (async () => {
      await refresh();
    })();
  }, [refresh]);

  async function run(fn: () => Promise<unknown>, okMessage: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(okMessage);
      await refresh();
      onChanged?.();
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setBusy(false);
    }
  }

  function addRule(e: React.FormEvent) {
    e.preventDefault();
    void run(
      () =>
        availabilityApi.createRule({
          day_of_week: Number(ruleDay),
          start_time: ruleStart,
          end_time: ruleEnd,
          slot_minutes: Number(ruleSlot),
        }),
      'Availability added',
    );
  }

  function addBlock(e: React.FormEvent) {
    e.preventDefault();
    void run(
      () =>
        availabilityApi.createBlock({
          starts_at: new Date(blockStart).toISOString(),
          ends_at: new Date(blockEnd).toISOString(),
          ...(blockReason.trim() ? { reason: blockReason.trim() } : {}),
        }),
      'Time blocked off',
    );
    setBlockReason('');
  }

  if (error) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        {error}
      </p>
    );
  }
  if (!rules || !blocks || !timezone) {
    return <LoadingState label="Loading availability…" />;
  }

  const zones = COMMON_ZONES.includes(timezone)
    ? COMMON_ZONES
    : [...COMMON_ZONES, timezone];

  return (
    <div className="space-y-4">
      {/* ── Timezone ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timezone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Open spots are generated in this zone, so daylight saving lands
            where your gym actually is.
          </p>
          <Select
            value={timezone}
            onValueChange={(tz) =>
              void run(
                () => availabilityApi.updateSettings({ timezone: tz }),
                'Timezone updated',
              )
            }
            disabled={busy}
          >
            <SelectTrigger className="max-w-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {zones.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* ── Weekly rules ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly hours</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rules.length === 0 ? (
            <EmptyState
              title="No hours set"
              description="Add a window below and clients can start requesting spots."
            />
          ) : (
            <div className="space-y-2">
              {rules.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background/40 px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-24 font-medium">
                      {DAY_NAMES[r.day_of_week] ?? `Day ${r.day_of_week}`}
                    </span>
                    <span className="text-muted-foreground">
                      {toTimeInput(r.start_time)} – {toTimeInput(r.end_time)}
                    </span>
                    <Badge variant="outline">{r.slot_minutes} min slots</Badge>
                    {!r.is_active ? (
                      <Badge variant="secondary">Paused</Badge>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () =>
                            availabilityApi.updateRule(r.id, {
                              is_active: !r.is_active,
                            }),
                          r.is_active ? 'Paused' : 'Active',
                        )
                      }
                    >
                      {r.is_active ? 'Pause' : 'Activate'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      className="text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
                      onClick={() => {
                        if (!window.confirm('Delete this window?')) return;
                        void run(
                          () => availabilityApi.deleteRule(r.id),
                          'Window deleted',
                        );
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form
            onSubmit={addRule}
            className="grid gap-3 rounded-md border border-dashed border-border p-3 md:grid-cols-5"
          >
            <div className="space-y-2">
              <Label>Day</Label>
              <Select value={ruleDay} onValueChange={setRuleDay}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_NAMES.map((name, idx) => (
                    <SelectItem key={name} value={String(idx)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rule-start">Start</Label>
              <Input
                id="rule-start"
                type="time"
                value={ruleStart}
                onChange={(e) => setRuleStart(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rule-end">End</Label>
              <Input
                id="rule-end"
                type="time"
                value={ruleEnd}
                onChange={(e) => setRuleEnd(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Slot length</Label>
              <Select value={ruleSlot} onValueChange={setRuleSlot}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SLOT_LENGTHS.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={busy} className="w-full">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Blocked time ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Blocked time</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {blocks.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nothing blocked off in the next 62 days.
            </p>
          ) : (
            <div className="space-y-2">
              {blocks.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background/40 px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <CalendarOff className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {fmtBlockWhen(b.starts_at)} → {fmtBlockWhen(b.ends_at)}
                    </span>
                    {b.reason ? (
                      <span className="text-xs text-muted-foreground">
                        {b.reason}
                      </span>
                    ) : null}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    className="text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
                    onClick={() =>
                      void run(
                        () => availabilityApi.deleteBlock(b.id),
                        'Block removed',
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <form
            onSubmit={addBlock}
            className="grid gap-3 rounded-md border border-dashed border-border p-3 md:grid-cols-4"
          >
            <div className="space-y-2">
              <Label htmlFor="block-start">From</Label>
              <Input
                id="block-start"
                type="datetime-local"
                value={blockStart}
                min={toLocalInput(new Date())}
                onChange={(e) => setBlockStart(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="block-end">To</Label>
              <Input
                id="block-end"
                type="datetime-local"
                value={blockEnd}
                onChange={(e) => setBlockEnd(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="block-reason">Reason (optional)</Label>
              <Input
                id="block-reason"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Competition weekend"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={busy} className="w-full">
                <Plus className="h-4 w-4" />
                Block it
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
