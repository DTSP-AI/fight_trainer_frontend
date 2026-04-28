'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/common/loading-state';
import { EmptyState } from '@/components/common/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { libraryApi } from '@/lib/api/library';
import { describeApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Sport, Technique } from '@/lib/types';

const SPORTS: Sport[] = [
  'bjj',
  'mma',
  'muay_thai',
  'boxing',
  'wrestling',
  'kickboxing',
];

interface TreeNode {
  technique: Technique;
  children: TreeNode[];
}

function buildTree(items: Technique[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  items.forEach((t) => byId.set(t.id, { technique: t, children: [] }));
  const roots: TreeNode[] = [];
  for (const node of byId.values()) {
    const parent = node.technique.parent_id
      ? byId.get(node.technique.parent_id)
      : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

function NodeRow({ node, depth }: { node: TreeNode; depth: number }) {
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = node.children.length > 0;
  return (
    <div>
      <button
        type="button"
        className={cn(
          'flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm transition-colors hover:bg-secondary/40',
          !hasChildren && 'cursor-default opacity-90',
        )}
        onClick={() => hasChildren && setOpen(!open)}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <ChevronRight
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-90',
            !hasChildren && 'opacity-0',
          )}
        />
        <span className="font-mono text-xs">{node.technique.name}</span>
        <Badge variant="outline" className="text-[10px] uppercase">
          {node.technique.skill_floor}
        </Badge>
        {node.technique.category ? (
          <span className="text-xs text-muted-foreground">
            · {node.technique.category}
          </span>
        ) : null}
      </button>
      {hasChildren && open
        ? node.children.map((child) => (
            <NodeRow
              key={child.technique.id}
              node={child}
              depth={depth + 1}
            />
          ))
        : null}
    </div>
  );
}

export function TaxonomyTree() {
  const [sport, setSport] = useState<Sport>('bjj');
  const [items, setItems] = useState<Technique[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    libraryApi
      .techniques({ sport, limit: 500 })
      .then((res) => {
        if (!cancelled) setItems(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(describeApiError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [sport]);

  const tree = useMemo(() => (items ? buildTree(items) : []), [items]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base">Technique taxonomy</CardTitle>
        <div className="w-44">
          <Select value={sport} onValueChange={(v) => setSport(v as Sport)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPORTS.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : items == null ? (
          <LoadingState label="Loading taxonomy…" />
        ) : tree.length === 0 ? (
          <EmptyState
            title="No techniques yet"
            description="Add techniques via the API or the import script."
          />
        ) : (
          <div className="space-y-0.5">
            {tree.map((node) => (
              <NodeRow key={node.technique.id} node={node} depth={0} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
