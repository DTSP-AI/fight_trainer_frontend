'use client';

/**
 * Wrapper around KnowledgeGraph3D that pulls Fight Trainer's technique
 * graph data (nodes + edges) and the optional student overlay, then maps
 * everything into the kg_schema.json shape the 3D component expects.
 */
import { useEffect, useMemo, useState } from 'react';
import { KnowledgeGraph3D } from './KnowledgeGraph3D';
import {
  graphApi,
  type GraphEdge,
  type GraphNode,
  type Initiative,
} from '@/lib/api/graph';
import { describeApiError } from '@/lib/api';
import { LoadingState } from '@/components/common/loading-state';

const DISCIPLINE_PALETTE: Record<string, string> = {
  submission: '#a78bfa',
  strike: '#fbbf24',
  takedown: '#38bdf8',
  control: '#34d399',
  guard: '#34d399',
  defense: '#fb923c',
  transition: '#f472b6',
  default: '#94a3b8',
};

const STUDENT_OVERLAY_PALETTE: Record<string, string> = {
  drilled: '#10b981',
  focus: '#a78bfa',
  recommended: '#f59e0b',
};

const INITIATIVE_PALETTE: Record<string, string> = {
  lead: '#f59e0b', // amber — Ken no Sen
  sim_counter: '#a78bfa', // violet — Tai no Sen
  delayed_counter: '#10b981', // emerald — Go no Sen
  feint: '#fb7185', // rose — deception
  default: '#475569', // slate — unclassified
};

interface Props {
  sport?: string;
  studentId?: string;
  initiative?: Initiative;
  height?: number;
  className?: string;
}

export function TechniqueGraphView({
  sport,
  studentId,
  initiative,
  height = 640,
  className,
}: Props) {
  const [nodes, setNodes] = useState<GraphNode[] | null>(null);
  const [edges, setEdges] = useState<GraphEdge[] | null>(null);
  const [drilled, setDrilled] = useState<Set<string>>(new Set());
  const [focus, setFocus] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [n, e] = await Promise.all([
          graphApi.techniques({ sport, limit: 1500 }),
          graphApi.edges({
            sport,
            initiative,
            min_weight: 0.0,
            limit: 5000,
          }),
        ]);
        if (cancelled) return;
        setNodes(n);
        setEdges(e);
      } catch (err) {
        if (!cancelled) setError(describeApiError(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sport, initiative]);

  useEffect(() => {
    if (!studentId) {
      setDrilled(new Set());
      setFocus(new Set());
      return;
    }
    let cancelled = false;
    graphApi
      .studentOverlay(studentId)
      .then((o) => {
        if (cancelled) return;
        setDrilled(new Set(o.drilled_ids));
        setFocus(new Set(o.focus_ids));
      })
      .catch(() => {
        // Soft-fail — overlay is optional.
      });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  // ── Map our backend shape into kg_schema {nodes, edges, palette} ──
  const payload = useMemo(() => {
    if (!nodes || !edges) return null;

    // Compute "recommended" nodes: targets of edges leaving any drilled
    // node, that are NOT themselves drilled. Lights up "next steps".
    const recommended = new Set<string>();
    if (drilled.size > 0) {
      for (const e of edges) {
        if (drilled.has(e.from_technique_id) && !drilled.has(e.to_technique_id)) {
          recommended.add(e.to_technique_id);
        }
      }
    }

    const palette: Record<string, string> = {
      ...DISCIPLINE_PALETTE,
      ...STUDENT_OVERLAY_PALETTE,
    };

    const mappedNodes = nodes.map((n) => {
      // Pick the visualization "type" so the 3D component colors it.
      // Student overlay wins; otherwise color by discipline_class.
      let type: string;
      if (studentId && drilled.has(n.id)) type = 'drilled';
      else if (studentId && focus.has(n.id)) type = 'focus';
      else if (studentId && recommended.has(n.id)) type = 'recommended';
      else type = (n.discipline_class || 'default').toLowerCase();

      const tenants = n.stats?.distinct_tenant_count ?? 0;
      const mentions = n.stats?.analysis_mention_count ?? 0;
      return {
        id: n.id,
        name: n.name,
        type,
        subtitle:
          mentions > 0
            ? `${mentions} mention${mentions === 1 ? '' : 's'} · ${tenants} gym${
                tenants === 1 ? '' : 's'
              }`
            : n.discipline_class ?? '',
        props: {
          sport: n.sport,
          discipline_class: n.discipline_class,
          mentions,
          tenants,
        },
      };
    });

    const mappedEdges = edges.map((e) => ({
      source: e.from_technique_id,
      target: e.to_technique_id,
      type: e.kind,
      weight: e.weight,
      frequency: e.contribution_count,
      primary_initiative: e.primary_initiative ?? null,
    }));

    return {
      nodes: mappedNodes,
      edges: mappedEdges,
      palette,
      edgePalette: INITIATIVE_PALETTE,
      metadata: { project: 'Fight Trainer KG' },
    };
  }, [nodes, edges, drilled, focus, studentId]);

  if (error) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        {error}
      </p>
    );
  }
  if (!payload) {
    return <LoadingState label="Loading the graph…" />;
  }

  return (
    <KnowledgeGraph3D
      data={payload}
      height={height}
      className={className}
      backgroundColor="#020617"
    />
  );
}
