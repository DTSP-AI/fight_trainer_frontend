'use client';

/**
 * KnowledgeGraph3D — Fight Trainer-tuned 3D force graph.
 *
 * Differences from the generic agentic-kg-pipeline drop-in:
 *   - Node drag enabled, smoother orbit controls (not trackball).
 *   - Fly-to-node on click, fit-to-view on data load + on-demand reset.
 *   - Cursor-following hover tooltip instead of pinned bottom-left.
 *   - Tailwind-themed overlays (legend, header) instead of inline styles.
 *   - Edge color carries `primary_initiative` (Musashi's 3 + Feint).
 *   - Color fallback chain on nodes so nothing is gray-by-default.
 *
 * Schema contract: matches assets/kg_schema.json — adds optional
 * `primary_initiative` on edges and `palette.edges` for edge color overrides.
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import dynamic from 'next/dynamic';
import { Maximize2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false });

// ── Types ──────────────────────────────────────────────────────────

export interface KGNode {
  id: string;
  name: string;
  type: string;
  canonical?: boolean;
  subtitle?: string;
  props?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface KGEdge {
  source: string;
  target: string;
  type: string;
  weight?: number;
  frequency?: number;
  /** Musashi initiative classification — drives edge color. */
  primary_initiative?: 'lead' | 'sim_counter' | 'delayed_counter' | 'feint' | null;
  [key: string]: unknown;
}

export interface KGPayload {
  nodes: KGNode[];
  edges: KGEdge[];
  /** Primary palette: maps node `type` → hex color. */
  palette?: Record<string, string>;
  /** Optional edge palette: maps `primary_initiative` → hex color. */
  edgePalette?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeGraph3DProps {
  data?: KGPayload;
  fetchUrl?: string;
  refreshKey?: number | string;
  palette?: Record<string, string>;
  edgePalette?: Record<string, string>;
  height?: number;
  backgroundColor?: string;
  onNodeClick?: (node: KGNode) => void;
  showLegend?: boolean;
  showHeader?: boolean;
  className?: string;
  authHeader?: string;
}

// ── Defaults ───────────────────────────────────────────────────────

const DEFAULT_NODE_PALETTE: Record<string, string> = {
  // Combat-sport discipline classes (Fight Trainer canonical):
  submission: '#a78bfa',
  strike: '#fbbf24',
  takedown: '#38bdf8',
  control: '#34d399',
  guard: '#34d399',
  defense: '#fb923c',
  transition: '#f472b6',
  // Student overlay:
  drilled: '#10b981',
  focus: '#a78bfa',
  recommended: '#f59e0b',
  // Unknown fallback:
  default: '#94a3b8',
};

const DEFAULT_EDGE_PALETTE: Record<string, string> = {
  // Musashi's 3 + Feint:
  lead: '#f59e0b', // amber — initiative of attack
  sim_counter: '#a78bfa', // violet — meet on the same beat
  delayed_counter: '#10b981', // emerald — counter on recovery
  feint: '#fb7185', // rose — deception
  // Unclassified:
  default: '#475569', // slate — quiet until evidence accrues
};

// Stable hash → hue so unknown node types still get a unique non-gray color.
function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}
function fallbackColor(seed: string): string {
  return `hsl(${hashHue(seed)} 65% 60%)`;
}

const LARGE_NODE_THRESHOLD = 140;
const LARGE_EDGE_THRESHOLD = 260;

// ── Component ──────────────────────────────────────────────────────

export function KnowledgeGraph3D({
  data,
  fetchUrl,
  refreshKey,
  palette,
  edgePalette,
  height = 640,
  backgroundColor = '#020617',
  onNodeClick,
  showLegend = true,
  showHeader = true,
  className = '',
  authHeader,
}: KnowledgeGraph3DProps) {
  const [payload, setPayload] = useState<KGPayload | null>(data ?? null);
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState<string>('');
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hovered, setHovered] = useState<KGNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 800, height });
  const containerRef = useRef<HTMLDivElement>(null);
  // react-force-graph-3d's ref is loosely typed — we cast at the call sites.
  const graphRef = useRef<unknown>(null);

  const nodePalette = useMemo(
    () => ({ ...DEFAULT_NODE_PALETTE, ...(payload?.palette ?? {}), ...(palette ?? {}) }),
    [palette, payload?.palette],
  );
  const edgeInitiativePalette = useMemo(
    () => ({ ...DEFAULT_EDGE_PALETTE, ...(payload?.edgePalette ?? {}), ...(edgePalette ?? {}) }),
    [edgePalette, payload?.edgePalette],
  );

  // ── Fetch ──
  useEffect(() => {
    if (data) {
      setPayload(data);
      setLoading(false);
      return;
    }
    if (!fetchUrl) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    const headers: Record<string, string> = {};
    if (authHeader) headers.Authorization = authHeader;
    fetch(fetchUrl, { headers })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json: KGPayload) => {
        if (cancelled) return;
        if (!Array.isArray(json.nodes) || !Array.isArray(json.edges)) {
          throw new Error('Response missing nodes/edges arrays');
        }
        setPayload(json);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message ?? 'Failed to load graph');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [data, fetchUrl, refreshKey, authHeader]);

  // ── Responsive sizing ──
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setSize((s) => ({ ...s, width: w }));
      }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // ── Build derived data ──
  const graphData = useMemo(() => {
    if (!payload) return { nodes: [], links: [] };
    const visibleNodes = payload.nodes.filter((n) => !hidden.has(n.type));
    const visibleIds = new Set(visibleNodes.map((n) => n.id));
    const degree: Record<string, number> = {};
    for (const e of payload.edges) {
      if (!visibleIds.has(e.source) || !visibleIds.has(e.target)) continue;
      degree[e.source] = (degree[e.source] ?? 0) + 1;
      degree[e.target] = (degree[e.target] ?? 0) + 1;
    }

    const colorFor = (n: KGNode): string => {
      const explicit = nodePalette[n.type];
      if (explicit) return explicit;
      // Fallback chain so no node is ever gray-by-default.
      const sportProp =
        typeof n.props?.sport === 'string' ? (n.props.sport as string) : '';
      if (sportProp && nodePalette[sportProp]) return nodePalette[sportProp];
      return fallbackColor(n.type || n.id);
    };

    return {
      nodes: visibleNodes.map((n) => ({
        ...n,
        val:
          Math.max(2.5, Math.min(9, 2.5 + Math.sqrt(degree[n.id] ?? 0) * 0.9)) *
          (n.canonical ? 1.4 : 1),
        color: colorFor(n),
      })),
      links: payload.edges
        .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
        .map((e) => ({
          source: e.source,
          target: e.target,
          type: e.type,
          weight: e.weight ?? 1,
          frequency: e.frequency,
          primary_initiative: e.primary_initiative ?? null,
          color:
            (e.primary_initiative &&
              edgeInitiativePalette[e.primary_initiative]) ||
            edgeInitiativePalette.default,
        })),
    };
  }, [payload, hidden, nodePalette, edgeInitiativePalette]);

  const isLarge =
    graphData.nodes.length > LARGE_NODE_THRESHOLD ||
    graphData.links.length > LARGE_EDGE_THRESHOLD;

  const typeCounts = useMemo(() => {
    const c: Record<string, number> = {};
    if (!payload) return c;
    for (const n of payload.nodes) c[n.type] = (c[n.type] ?? 0) + 1;
    return c;
  }, [payload]);

  const toggleType = useCallback((t: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }, []);

  // ── Camera controls ──
  function fitView() {
    const g = graphRef.current as
      | { zoomToFit?: (ms?: number, padding?: number) => void }
      | null;
    g?.zoomToFit?.(800, 60);
  }

  function flyToNode(node: KGNode & { x?: number; y?: number; z?: number }) {
    const g = graphRef.current as
      | {
          cameraPosition?: (
            pos: { x: number; y: number; z: number },
            lookAt?: { x: number; y: number; z: number },
            ms?: number,
          ) => void;
        }
      | null;
    if (!g?.cameraPosition || node.x == null || node.y == null || node.z == null) {
      return;
    }
    const dist = 80;
    const r = Math.hypot(node.x, node.y, node.z) || 1;
    g.cameraPosition(
      {
        x: node.x * (1 + dist / r),
        y: node.y * (1 + dist / r),
        z: node.z * (1 + dist / r),
      },
      { x: node.x, y: node.y, z: node.z },
      900,
    );
  }

  // Auto-fit once layout has cooled.
  const handleEngineStop = useCallback(() => {
    fitView();
  }, []);

  const handleNodeClick = useCallback(
    (n: object) => {
      const node = n as KGNode & { x?: number; y?: number; z?: number };
      flyToNode(node);
      onNodeClick?.(node);
    },
    [onNodeClick],
  );

  // ── Hover tooltip follows cursor ──
  function handleMouseMove(e: ReactMouseEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  // ── Render ──

  if (loading) {
    return (
      <div
        ref={containerRef}
        className={cn(
          'flex items-center justify-center rounded-md border border-border bg-background/40 text-sm text-muted-foreground',
          className,
        )}
        style={{ height, background: backgroundColor }}
      >
        Loading graph…
      </div>
    );
  }

  if (error) {
    return (
      <div
        ref={containerRef}
        className={cn(
          'rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive',
          className,
        )}
        style={{ height, background: backgroundColor }}
      >
        Failed to load graph: {error}
      </div>
    );
  }

  if (!payload || payload.nodes.length === 0) {
    return (
      <div
        ref={containerRef}
        className={cn(
          'flex items-center justify-center rounded-md border border-border bg-background/40 text-sm text-muted-foreground',
          className,
        )}
        style={{ height, background: backgroundColor }}
      >
        No graph data yet — run a fight breakdown and edges will start
        accreting here.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden rounded-md', className)}
      style={{ height, background: backgroundColor }}
      onMouseMove={handleMouseMove}
    >
      {/* Header */}
      {showHeader && (
        <div className="absolute left-3 top-3 z-10 rounded-md border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 backdrop-blur">
          <div className="font-semibold">
            {(payload.metadata?.project as string) ?? 'Knowledge Graph'}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400">
            {graphData.nodes.length} nodes · {graphData.links.length} edges
            {isLarge ? ' · perf mode' : ''}
          </div>
        </div>
      )}

      {/* Camera controls */}
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={fitView}
          title="Fit to view"
          className="rounded-md border border-white/10 bg-slate-950/80 p-1.5 text-slate-100 backdrop-blur transition-colors hover:bg-slate-900"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            const g = graphRef.current as
              | { zoomToFit?: (ms?: number, padding?: number) => void }
              | null;
            g?.zoomToFit?.(0, 60);
          }}
          title="Reset camera"
          className="rounded-md border border-white/10 bg-slate-950/80 p-1.5 text-slate-100 backdrop-blur transition-colors hover:bg-slate-900"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Legend */}
      {showLegend && Object.keys(typeCounts).length > 0 && (
        <div className="absolute bottom-3 right-3 z-10 max-h-[55%] overflow-y-auto rounded-md border border-white/10 bg-slate-950/80 px-3 py-2 text-[11px] text-slate-100 backdrop-blur">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Node types · click to toggle
          </div>
          {Object.keys(typeCounts).sort().map((t) => {
            const color =
              nodePalette[t] ?? fallbackColor(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleType(t)}
                className={cn(
                  'flex w-full items-center gap-2 py-0.5 text-left',
                  hidden.has(t) ? 'opacity-40' : 'opacity-100',
                )}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: color }}
                />
                <span>{t}</span>
                <span className="ml-auto text-slate-500">{typeCounts[t]}</span>
              </button>
            );
          })}

          <div className="mt-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Edge initiative
          </div>
          {(['lead', 'sim_counter', 'delayed_counter', 'feint'] as const).map(
            (k) => {
              const labels = {
                lead: 'Lead',
                sim_counter: 'Sim Counter',
                delayed_counter: 'Delayed Counter',
                feint: 'Feint',
              };
              return (
                <div key={k} className="flex items-center gap-2 py-0.5">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ background: edgeInitiativePalette[k] }}
                  />
                  <span>{labels[k]}</span>
                </div>
              );
            },
          )}
        </div>
      )}

      {/* Hover tooltip — follows cursor */}
      {hovered && (
        <div
          className="pointer-events-none absolute z-20 max-w-xs rounded-md border border-white/15 bg-slate-950/95 px-3 py-2 text-xs text-slate-100 shadow-lg backdrop-blur"
          style={{
            left: Math.min(tooltipPos.x + 14, size.width - 280),
            top: Math.max(tooltipPos.y - 16, 8),
          }}
        >
          <div className="font-semibold">{hovered.name}</div>
          <div className="mt-0.5 text-[11px] text-slate-400">
            {hovered.type}
            {hovered.canonical ? ' · canonical' : ''}
          </div>
          {hovered.subtitle ? (
            <div className="mt-1 text-[11px]">{hovered.subtitle}</div>
          ) : null}
        </div>
      )}

      {/* The canvas itself */}
      <ForceGraph3D
        ref={graphRef as unknown as React.MutableRefObject<undefined>}
        graphData={graphData}
        width={size.width}
        height={height}
        backgroundColor={backgroundColor}
        // ─── Controls: orbit feels natural; trackball had snap-to-axis stickiness ───
        controlType="orbit"
        enableNodeDrag
        enableNavigationControls
        showNavInfo={false}
        // ─── Node + edge styling ───
        nodeOpacity={0.95}
        nodeResolution={isLarge ? 4 : 8}
        nodeColor={(n: object) => (n as KGNode & { color: string }).color}
        nodeLabel={() => ''} // we render our own cursor-following tooltip
        linkOpacity={isLarge ? 0.4 : 0.55}
        linkWidth={(l: object) =>
          Math.max(0.6, ((l as KGEdge).weight ?? 1) * 1.6)
        }
        linkColor={(l: object) => (l as KGEdge & { color: string }).color}
        linkDirectionalParticles={(l: object) =>
          ((l as KGEdge).weight ?? 0) > 0.6 ? 2 : 0
        }
        linkDirectionalParticleSpeed={0.004}
        linkDirectionalParticleWidth={1.5}
        linkResolution={isLarge ? 2 : 4}
        // ─── Layout — tuned for responsive feel without endless wobble ───
        warmupTicks={20}
        cooldownTicks={isLarge ? 60 : 120}
        d3AlphaDecay={0.025}
        d3VelocityDecay={0.28}
        // ─── Interactions ───
        onEngineStop={handleEngineStop}
        onNodeHover={(n: object | null) => setHovered(n as KGNode | null)}
        onNodeClick={handleNodeClick}
      />
    </div>
  );
}

export default KnowledgeGraph3D;
