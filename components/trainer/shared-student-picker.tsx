'use client';

import { Label } from '@/components/ui/label';
import type { Student } from '@/lib/types';

/** Checkbox roster for sharing a package with other students (migration 040).
 *
 * Owner is excluded — the backend drops it anyway, but the UI should not
 * offer a no-op. Renders nothing when there is nobody else to share with.
 */
export function SharedStudentPicker({
  students,
  ownerId,
  selected,
  onToggle,
}: {
  students: Student[];
  ownerId: string;
  selected: string[];
  onToggle: (id: string, on: boolean) => void;
}) {
  const others = students.filter((s) => s.id !== ownerId);
  if (others.length === 0) return null;
  return (
    <div className="space-y-1">
      <Label>Share with (optional)</Label>
      <p className="text-xs text-muted-foreground">
        Shared students can book against this package. Billing stays with the
        student above.
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {others.map((s) => (
          <label key={s.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(s.id)}
              onChange={(e) => onToggle(s.id, e.target.checked)}
            />
            {s.full_name}
          </label>
        ))}
      </div>
    </div>
  );
}
