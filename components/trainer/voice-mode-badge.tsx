'use client';

import { useState } from 'react';
import { Mic } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api';
import { sessionsApi } from '@/lib/api/sessions';

/**
 * Manifest M2 enforcement — voice mode seam.
 *
 * Renders a tasteful "Voice mode coming soon" badge on the session-log
 * surface. Clicking it hits POST /api/sessions/voice-stream which the
 * backend returns 501 for. We surface that gracefully via toast.
 *
 * Drift watch (FIGHT_TRAINER.md §4.2):
 *   - If the badge is omitted → MVP gate fails.
 *   - If /voice-stream returns anything other than 501 → MVP gate fails.
 *   - If supervisor contract `mode` field is absent → MVP gate fails (backend).
 */
export function VoiceModeBadge() {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (pending) return;
    setPending(true);
    try {
      // Expected: ApiClientError code=NOT_IMPLEMENTED, status=501.
      await sessionsApi.voiceStream();
      // Shouldn't reach here in v1.
      toast.success('Voice mode is live now.');
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 501) {
        toast.info('Voice mode is in development.', {
          description:
            'Type your session for now — voice mode will land without changing the contract.',
        });
      } else {
        toast.error(
          err instanceof Error
            ? err.message
            : 'Could not reach the voice mode endpoint.',
        );
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-dashed border-border bg-card/60 p-3">
      <Mic className="h-4 w-4 text-muted-foreground" aria-hidden />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Voice mode</span>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
            Coming soon
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Type your session log for now. Voice arrives without breaking this
          form.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={pending}
      >
        {pending ? 'Checking…' : 'Try voice'}
      </Button>
    </div>
  );
}
