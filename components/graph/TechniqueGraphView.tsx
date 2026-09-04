'use client';

/**
 * Wrapper around KnowledgeGraph3D that pulls Fight Trainer's technique
 * graph data (nodes + edges) and the optional student overlay, then maps
 * everything into the kg_schema.json shape the 3D component expects.
 */
import { useEffect, useMemo, useState } from 'react';
import { BRAND } from '@/lib/brand';
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
  movement: '#60a5fa',
  uncategorized: '#94a3b8',
  // Strategy canon — Musashi (gold) and Sun Tzu (crimson). Migration
  // 016/017/018 seeded ~30 canonical principles with these category prefixes.
  'principle.musashi': '#f59e0b',
  'principle.sun_tzu': '#dc2626',
  // BJJ canon (migration 019) — distinct hues per role in the chain.
  'bjj.position': '#22c55e',     // emerald — positional anchors (mount, side, back, guard)
  'bjj.guard': '#10b981',        // teal-green — specific guards (DLR, X, butterfly)
  'bjj.pass': '#06b6d4',         // cyan — passes
  'bjj.sweep': '#3b82f6',        // blue — sweeps
  'bjj.submission': '#a78bfa',   // violet — submissions (matches striking/grappling 'submission')
  'bjj.transition': '#f472b6',   // pink — transitions (back take, S-mount)
  'bjj.escape': '#fb923c',       // orange — defensive escapes
  // MMA / wrestling canon (migration 020) — Pete's lead-foot-dom chain palette.
  'mma.setup': '#facc15',        // yellow — setup layer (striking pressure, level change)
  'mma.clinch': '#c084fc',       // lavender — clinch positions (body lock, plum)
  'mma.takedown': '#0ea5e9',     // sky blue — takedowns
  'mma.defense': '#f97316',      // orange — wrestling defense (sprawl, whizzer)
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
  /** When true, click-a-node opens an edit panel with delete + reclassify
   *  buttons. Trainer-only callers should set this; student views skip. */
  editable?: boolean;
}

export function TechniqueGraphView({
  sport,
  studentId,
  initiative,
  height = 640,
  className,
  editable = false,
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
          // techniques() backend now includes canonical principles
          // regardless of sport filter (migration 016 strategy canon).
          graphApi.techniques({ sport, limit: 1500 }),
          // Don't sport-filter edges — KnowledgeGraph3D filters edges
          // client-side to those whose endpoints are in the visible
          // node set, which already gives the right answer per art.
          graphApi.edges({
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

      const dc = n.discipline_class || '';
      const isPrinciple = dc.startsWith('principle.');
      const isBjjCanon = dc.startsWith('bjj.');
      const isMmaCanon = dc.startsWith('mma.');
      const isCanonical = isPrinciple;
      const tenants = n.stats?.distinct_tenant_count ?? 0;
      const mentions = n.stats?.analysis_mention_count ?? 0;
      const sportLabel = (n.sport || '').toUpperCase();
      const categoryLeaf = dc.includes('.')
        ? dc.split('.').pop() ?? ''
        : dc;
      const categoryLabel = categoryLeaf
        ? categoryLeaf.charAt(0).toUpperCase() + categoryLeaf.slice(1)
        : '';
      const subtitleParts: string[] = [];
      if (isPrinciple) {
        subtitleParts.push(
          dc === 'principle.musashi'
            ? 'Musashi · Book of Five Rings'
            : 'Sun Tzu · Art of War',
        );
        subtitleParts.push('Universal across arts');
      } else if (isBjjCanon) {
        subtitleParts.push(`BJJ · ${categoryLabel}`);
        if (mentions > 0) {
          subtitleParts.push(
            `${mentions} mention${mentions === 1 ? '' : 's'}`,
          );
        }
      } else if (isMmaCanon) {
        subtitleParts.push(`MMA · ${categoryLabel}`);
        if (mentions > 0) {
          subtitleParts.push(
            `${mentions} mention${mentions === 1 ? '' : 's'}`,
          );
        }
      } else {
        if (sportLabel) subtitleParts.push(sportLabel);
        if (dc) subtitleParts.push(dc);
        if (mentions > 0) {
          subtitleParts.push(
            `${mentions} mention${mentions === 1 ? '' : 's'} · ${tenants} gym${
              tenants === 1 ? '' : 's'
            }`,
          );
        }
      }
      return {
        id: n.id,
        name: n.name,
        type,
        // Canonical strategy principles render larger (1.4x) and gold/
        // crimson — they're the trunk that empirical leaves hook into.
        canonical: isCanonical,
        subtitle: subtitleParts.join(' · '),
        props: {
          sport: n.sport,
          discipline_class: n.discipline_class,
          mentions,
          tenants,
        },
      };
    });

    const mappedEdges = edges.map((e) => ({
      id: e.id,
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
      metadata: { project: `${BRAND.name} KG` },
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

  async function handleEdgeDelete(edgeId: string) {
    try {
      await graphApi.deleteEdge(edgeId);
      setEdges((prev) =>
        prev ? prev.filter((e) => e.id !== edgeId) : prev,
      );
    } catch (err) {
      const { toast } = await import('sonner');
      toast.error(describeApiError(err));
    }
  }

  async function handleEdgeReclassify(
    edgeId: string,
    init: Initiative,
  ) {
    try {
      await graphApi.updateEdge(edgeId, { initiative: init });
      setEdges((prev) =>
        prev
          ? prev.map((e) =>
              e.id === edgeId ? { ...e, primary_initiative: init } : e,
            )
          : prev,
      );
    } catch (err) {
      const { toast } = await import('sonner');
      toast.error(describeApiError(err));
    }
  }

  return (
    <KnowledgeGraph3D
      data={payload}
      height={height}
      className={className}
      backgroundColor="#020617"
      onEdgeDelete={editable ? handleEdgeDelete : undefined}
      onEdgeReclassify={editable ? handleEdgeReclassify : undefined}
    />
  );
}
