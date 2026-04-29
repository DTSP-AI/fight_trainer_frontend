'use client';

import { forwardRef, useState, type TextareaHTMLAttributes } from 'react';
import { Sparkles, Check, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { aiAssistApi, type NoteKind } from '@/lib/api/ai-assist';
import { describeApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

type Base = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'>;

export interface AssistedTextareaProps extends Base {
  value: string;
  onChange: (next: string) => void;
  /** Tells the assist endpoint what kind of field this is so it can
   *  pull the right unified context + use the right voice guidance. */
  assistKind?: NoteKind;
  /** When set, narrows context to this student's history. */
  assistStudentId?: string | null;
  /** Optional steering passed to the LLM ("make it shorter", etc.). */
  assistInstruction?: string;
  /** Hide the AI button if needed (e.g. for student-facing fields). */
  showAssist?: boolean;
}

/**
 * Drop-in replacement for `<Textarea>` that adds a Sparkles button which
 * polishes the current draft using unified tenant context. The trainer
 * sees the suggestion below the textarea and accepts/rejects.
 */
export const AssistedTextarea = forwardRef<
  HTMLTextAreaElement,
  AssistedTextareaProps
>(function AssistedTextarea(
  {
    value,
    onChange,
    assistKind = 'generic',
    assistStudentId = null,
    assistInstruction,
    showAssist = true,
    className,
    ...rest
  },
  ref,
) {
  const [busy, setBusy] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [contextCount, setContextCount] = useState(0);

  async function runAssist() {
    setBusy(true);
    try {
      const res = await aiAssistApi.note({
        kind: assistKind,
        draft: value ?? '',
        student_id: assistStudentId ?? undefined,
        instruction: assistInstruction,
      });
      setSuggestion(res.suggestion);
      setContextCount(res.used_context_count);
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setBusy(false);
    }
  }

  function accept() {
    if (suggestion != null) onChange(suggestion);
    setSuggestion(null);
  }

  function regenerate() {
    setSuggestion(null);
    void runAssist();
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(showAssist ? 'pr-10' : undefined, className)}
          {...rest}
        />
        {showAssist ? (
          <button
            type="button"
            onClick={runAssist}
            disabled={busy}
            title="AI assist — polish using unified context"
            className={cn(
              'absolute right-2 top-2 inline-flex h-7 w-7 items-center',
              'justify-center rounded-md text-violet-300 transition-colors',
              'hover:bg-violet-500/15 hover:text-violet-200',
              'disabled:opacity-40',
            )}
          >
            <Sparkles className={cn('h-4 w-4', busy && 'animate-pulse')} />
          </button>
        ) : null}
      </div>

      {suggestion != null ? (
        <div className="rounded-md border border-violet-500/40 bg-violet-500/5 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-violet-200">
            <Sparkles className="h-3 w-3" />
            Suggestion · drew from {contextCount} prior note
            {contextCount === 1 ? '' : 's'}
          </div>
          <p className="whitespace-pre-wrap text-sm text-foreground">
            {suggestion}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={accept}>
              <Check className="h-4 w-4" />
              Use this
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={regenerate}
              disabled={busy}
            >
              <RotateCcw className="h-4 w-4" />
              Regenerate
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setSuggestion(null)}
            >
              <X className="h-4 w-4" />
              Dismiss
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
});
