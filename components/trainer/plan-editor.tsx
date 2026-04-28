'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/common/loading-state';
import { studentsApi } from '@/lib/api/students';
import { plansApi } from '@/lib/api/plans';
import { describeApiError } from '@/lib/api';
import { DAYS_OF_WEEK } from '@/lib/utils';
import type {
  PlannedSessionInput,
  SessionType,
  Student,
} from '@/lib/types';

const SESSION_TYPES: SessionType[] = [
  'drilling',
  'sparring',
  'strength',
  'recovery',
  'padwork',
  'conditioning',
];

interface DraftSession extends PlannedSessionInput {
  draft_id: string;
}

function startOfWeek(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

function newDraft(day: number): DraftSession {
  return {
    draft_id: crypto.randomUUID(),
    day_of_week: day,
    session_type: 'drilling',
    targeted_technique_ids: [],
    notes: '',
  };
}

function SortableRow({
  session,
  onChange,
  onRemove,
}: {
  session: DraftSession;
  onChange: (next: DraftSession) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: session.draft_id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 rounded-md border border-border bg-background p-2"
    >
      <button
        type="button"
        className="mt-2 cursor-grab text-muted-foreground"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="grid flex-1 gap-2">
        <Select
          value={session.session_type}
          onValueChange={(v) =>
            onChange({ ...session, session_type: v as SessionType })
          }
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SESSION_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Notes (optional)"
          value={session.notes ?? ''}
          onChange={(e) => onChange({ ...session, notes: e.target.value })}
          className="h-9"
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Remove session"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function DayColumn({
  day,
  items,
  onChange,
}: {
  day: number;
  items: DraftSession[];
  onChange: (next: DraftSession[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((s) => s.draft_id === active.id);
    const newIndex = items.findIndex((s) => s.draft_id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(items, oldIndex, newIndex));
  }

  function add() {
    onChange([...items, newDraft(day)]);
  }

  function update(id: string, next: DraftSession) {
    onChange(items.map((it) => (it.draft_id === id ? next : it)));
  }

  function remove(id: string) {
    onChange(items.filter((it) => it.draft_id !== id));
  }

  const dayLabel = DAYS_OF_WEEK[day] ?? '';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm">{dayLabel}</CardTitle>
        <Button type="button" variant="ghost" size="sm" onClick={add}>
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {items.length === 0 ? (
          <p className="rounded border border-dashed border-border bg-card/50 p-3 text-center text-xs text-muted-foreground">
            Rest day
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((i) => i.draft_id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {items.map((session) => (
                  <SortableRow
                    key={session.draft_id}
                    session={session}
                    onChange={(next) => update(session.draft_id, next)}
                    onRemove={() => remove(session.draft_id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}

export function PlanEditor() {
  const params = useSearchParams();
  const initialStudent = params.get('studentId') ?? '';

  const [students, setStudents] = useState<Student[] | null>(null);
  const [studentId, setStudentId] = useState(initialStudent);
  const [weekStart, setWeekStart] = useState(startOfWeek());
  const [focus, setFocus] = useState('');
  const [sessions, setSessions] = useState<DraftSession[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);

  useEffect(() => {
    let cancelled = false;
    studentsApi
      .list()
      .then((res) => {
        if (!cancelled) setStudents(res);
      })
      .catch((err: unknown) => toast.error(describeApiError(err)));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    setLoadingPlan(true);
    plansApi
      .current(studentId)
      .then((res) => {
        if (cancelled) return;
        if (res.plan) {
          setWeekStart(res.plan.week_start);
          setFocus(res.plan.focus ?? '');
          setSessions(
            res.planned_sessions.map((ps) => ({
              draft_id: ps.id,
              day_of_week: ps.day_of_week,
              session_type: ps.session_type,
              targeted_technique_ids: ps.targeted_technique_ids,
              notes: ps.notes ?? '',
            })),
          );
        } else {
          setSessions([]);
          setFocus('');
        }
      })
      .catch((err: unknown) => toast.error(describeApiError(err)))
      .finally(() => {
        if (!cancelled) setLoadingPlan(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const sessionsByDay = useMemo(() => {
    const map: DraftSession[][] = Array.from({ length: 7 }, () => []);
    for (const s of sessions) {
      const day = Math.max(0, Math.min(6, s.day_of_week));
      map[day]!.push(s);
    }
    return map;
  }, [sessions]);

  function setDayItems(day: number, next: DraftSession[]) {
    const others = sessions.filter((s) => s.day_of_week !== day);
    setSessions([...others, ...next.map((s) => ({ ...s, day_of_week: day }))]);
  }

  async function save() {
    if (!studentId) {
      toast.error('Pick a student first.');
      return;
    }
    setSaving(true);
    try {
      await plansApi.create(studentId, {
        week_start: weekStart,
        focus: focus || null,
        planned_sessions: sessions.map((s) => ({
          day_of_week: s.day_of_week,
          session_type: s.session_type,
          targeted_technique_ids: s.targeted_technique_ids,
          notes: s.notes ?? null,
        })),
      });
      toast.success('Plan saved.');
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="grid w-64 gap-2">
          <Label>Student</Label>
          <Select value={studentId} onValueChange={setStudentId}>
            <SelectTrigger>
              <SelectValue placeholder="Pick a student" />
            </SelectTrigger>
            <SelectContent>
              {(students ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid w-44 gap-2">
          <Label htmlFor="week_start">Week start</Label>
          <Input
            id="week_start"
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
          />
        </div>
        <div className="grid flex-1 gap-2 min-w-[200px]">
          <Label htmlFor="focus">Weekly focus</Label>
          <Input
            id="focus"
            placeholder="e.g. Back attacks + competition prep"
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
          />
        </div>
        <Button type="button" onClick={save} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save plan'}
        </Button>
      </div>

      {loadingPlan ? (
        <LoadingState label="Loading plan…" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
          {sessionsByDay.map((items, day) => (
            <DayColumn
              key={day}
              day={day}
              items={items}
              onChange={(next) => setDayItems(day, next)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
