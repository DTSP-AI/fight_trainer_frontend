'use client';

/**
 * KnowledgeGraph3D — production-grade 3D force graph.
 *
 * Combines:
 *  - Smooth mechanics (orbit controls, drag enabled, tuned d3 layout)
 *  - Hover-to-highlight subgraph (dim non-connected; brighten neighbors)
 *  - Cached three.js node rendering with sprite labels on high-degree nodes
 *  - Fullscreen toggle (Esc to exit), refresh button, fit + reset cameras
 *  - Cursor-following hover tooltip
 *  - Edge color carries an arbitrary "initiative" (Musashi's 3 + Feint by default)
 *  - Color fallback chain so nothing is gray-by-default
 *
 * Schema: assets/kg_schema.json + optional `palette.edges` for edge colors.
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import dynamic from 'next/dynamic';
import {
  Gauge,
  Loader2,
  Maximize2,
  Minimize2,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), {
  ssr: false,
});

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
  primary_initiative?:
    | 'lead'
    | 'sim_counter'
    | 'delayed_counter'
    | 'feint'
    | null;
  [key: string]: unknown;
}

export interface KGPayload {
  nodes: KGNode[];
  edges: KGEdge[];
  palette?: Record<string, string>;
  edgePalette?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export type Initiative = 'lead' | 'sim_counter' | 'delayed_counter' | 'feint';

export interface KnowledgeGraph3DProps {
  data?: KGPayload;
  fetchUrl?: string;
  refreshKey?: number | string;
  palette?: Record<string, string>;
  edgePalette?: Record<string, string>;
  height?: number;
  backgroundColor?: string;
  onNodeClick?: (node: KGNode) => void;
  onRefresh?: () => void;
  /** Per-edge delete callback. When provided, the side panel renders a
   *  trash icon on each edge. Caller handles confirmation + persistence. */
  onEdgeDelete?: (edgeId: string) => Promise<void> | void;
  /** Per-edge initiative reclassify callback. When provided, the side
   *  panel renders an initiative dropdown on each edge. */
  onEdgeReclassify?: (edgeId: string, initiative: Initiative) => Promise<void> | void;
  showLegend?: boolean;
  showHeader?: boolean;
  /** Show the slide-in side panel on node click. Default true when any
   *  edit callback is provided, otherwise false (read-only mode). */
  showSidePanel?: boolean;
  className?: string;
  authHeader?: string;
}

// ── Defaults ───────────────────────────────────────────────────────

const DEFAULT_NODE_PALETTE: Record<string, string> = {
  // Combat-sport canonical:
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
  // Generic agentic-kg fallback (Person, Organization, etc.):
  Organization: '#c084fc',
  Person: '#60a5fa',
  Product: '#4ade80',
  Concept: '#facc15',
  default: '#94a3b8',
};

const DEFAULT_EDGE_PALETTE: Record<string, string> = {
  lead: '#f59e0b',
  sim_counter: '#a78bfa',
  delayed_counter: '#10b981',
  feint: '#fb7185',
  default: '#475569',
};

const DIM_NODE_COLOR = '#1f2937';
const DIM_EDGE_COLOR = '#0f172a';
const NEUTRAL_EDGE_COLOR = '#334155';

const LARGE_NODE_THRESHOLD = 140;
const LARGE_EDGE_THRESHOLD = 260;
const MAX_ALWAYS_LABELED_NODES = 18;

function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}
function fallbackColor(seed: string): string {
  return `hsl(${hashHue(seed)} 65% 60%)`;
}

function getNodeId(n: string | { id: string }): string {
  return typeof n === 'string' ? n : n.id;
}

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
  onRefresh,
  onEdgeDelete,
  onEdgeReclassify,
  showLegend = true,
  showHeader = true,
  showSidePanel,
  className = '',
  authHeader,
}: KnowledgeGraph3DProps) {
  const sidePanelEnabled =
    showSidePanel ?? Boolean(onEdgeDelete || onEdgeReclassify);
  const [payload, setPayload] = useState<KGPayload | null>(data ?? null);
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState<string>('');
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hovered, setHovered] = useState<KGNode | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [size, setSize] = useState({ width: 800, height });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<unknown>(null);

  // Three.js + sprite-text caches — loaded lazily on first node render.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const threeModuleRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const spriteModuleRef = useRef<any>(null);
  const objectCacheRef = useRef<Map<string, object>>(new Map());
  const geometryCacheRef = useRef<Map<number, object>>(new Map());
  const materialCacheRef = useRef<Map<string, object>>(new Map());

  // Hover highlight state (refs so repaints don't restart layout).
  // Forward = edges leaving the hovered node (offense ladder).
  // Reverse = edges arriving at the hovered node (defense / setup).
  // The palindrome reads: hover any technique, see what offense it
  // enables (green) and what enabled / counters it (rose).
  const highlightNodesRef = useRef<Set<string>>(new Set());
  const highlightForwardLinksRef = useRef<Set<string>>(new Set());
  const highlightReverseLinksRef = useRef<Set<string>>(new Set());
  const lastHoveredIdRef = useRef<string | null>(null);

  // No auto-fit. d3 force has a built-in centering force, so the graph
  // settles around the origin naturally. The default camera position is
  // already framed for that. Auto-fitting on engine settle fights the
  // user's drag — leave the camera alone (matches MW behavior).

  const nodePalette = useMemo(
    () => ({
      ...DEFAULT_NODE_PALETTE,
      ...(payload?.palette ?? {}),
      ...(palette ?? {}),
    }),
    [palette, payload?.palette],
  );
  const edgeInitiativePalette = useMemo(
    () => ({
      ...DEFAULT_EDGE_PALETTE,
      ...(payload?.edgePalette ?? {}),
      ...(edgePalette ?? {}),
    }),
    [edgePalette, payload?.edgePalette],
  );

  // ── Fetch ──
  useEffect(() => {
    if (data) {
      setPayload(data);
      setLoading(false);
      objectCacheRef.current.clear();
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
        objectCacheRef.current.clear();
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
  }, [data, fetchUrl, refreshKey, authHeader, refreshNonce]);

  // ── Responsive sizing ──
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        const h = Math.max(420, Math.floor(entry.contentRect.height));
        setSize((s) =>
          s.width === w && s.height === h ? s : { width: w, height: h },
        );
      }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [isFullscreen]);

  // ── Esc to exit fullscreen ──
  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFullscreen]);

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

    return {
      nodes: visibleNodes.map((n) => ({
        ...n,
        degree: degree[n.id] ?? 0,
        val:
          Math.max(2.5, Math.min(9, 2.5 + Math.sqrt(degree[n.id] ?? 0) * 0.9)) *
          (n.canonical ? 1.4 : 1),
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
        })),
    };
  }, [payload, hidden]);

  const isLarge =
    graphData.nodes.length > LARGE_NODE_THRESHOLD ||
    graphData.links.length > LARGE_EDGE_THRESHOLD;

  // ── Adjacency map for instant hover lookup ──
  const adjacency = useMemo(() => {
    const nodes = new Map<string, Set<string>>();
    const links = new Map<string, Set<string>>();
    for (const n of graphData.nodes) {
      nodes.set(n.id, new Set([n.id]));
      links.set(n.id, new Set());
    }
    for (const l of graphData.links) {
      const s = getNodeId(l.source as string);
      const t = getNodeId(l.target as string);
      const key = `${s}::${t}`;
      nodes.get(s)?.add(t);
      nodes.get(t)?.add(s);
      links.get(s)?.add(key);
      links.get(t)?.add(key);
    }
    return { nodes, links };
  }, [graphData.nodes, graphData.links]);

  // ── Top-degree nodes get permanent sprite labels ──
  const labeledNodeIds = useMemo(() => {
    if (isLarge) return new Set<string>();
    return new Set(
      [...graphData.nodes]
        .sort((a, b) => (b.degree ?? 0) - (a.degree ?? 0))
        .slice(0, MAX_ALWAYS_LABELED_NODES)
        .map((n) => n.id),
    );
  }, [graphData.nodes, isLarge]);

  const typeCounts = useMemo(() => {
    const c: Record<string, number> = {};
    if (!payload) return c;
    for (const n of payload.nodes) c[n.type] = (c[n.type] ?? 0) + 1;
    return c;
  }, [payload]);

  // ── Lazy-load three + sprite-text for custom node objects ──
  const ensureModules = useCallback(() => {
    if (!threeModuleRef.current) {
      // Dynamic require so SSR doesn't try to load three.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      threeModuleRef.current = require('three');
    }
    if (!spriteModuleRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      spriteModuleRef.current = require('three-spritetext').default;
    }
    return {
      THREE: threeModuleRef.current,
      SpriteText: spriteModuleRef.current,
    };
  }, []);

  const colorFor = useCallback(
    (node: KGNode): string => {
      const direct = nodePalette[node.type];
      if (direct) return direct;
      const sportProp =
        typeof node.props?.sport === 'string'
          ? (node.props.sport as string)
          : '';
      if (sportProp && nodePalette[sportProp]) return nodePalette[sportProp];
      return fallbackColor(node.type || node.id);
    },
    [nodePalette],
  );

  const getMaterial = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (THREE: any, color: string) => {
      const cache = materialCacheRef.current;
      if (!cache.has(color)) {
        cache.set(
          color,
          new THREE.MeshLambertMaterial({
            color,
            transparent: true,
            opacity: 0.9,
          }),
        );
      }
      return cache.get(color);
    },
    [],
  );

  const getGeometry = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (THREE: any, radius: number) => {
      const r = Number(radius.toFixed(1));
      const cache = geometryCacheRef.current;
      if (!cache.has(r)) {
        cache.set(r, new THREE.SphereGeometry(r, 8, 6));
      }
      return cache.get(r);
    },
    [],
  );

  const nodeThreeObject = useCallback(
    (node: object) => {
      const n = node as KGNode & { degree: number; val: number };
      const cache = objectCacheRef.current;
      if (cache.has(n.id)) return cache.get(n.id)!;

      const { THREE, SpriteText } = ensureModules();
      const group = new THREE.Group();
      const sphere = new THREE.Mesh(
        getGeometry(THREE, n.val),
        getMaterial(THREE, colorFor(n)),
      );
      sphere.name = 'sphere';
      group.add(sphere);

      const shouldLabel =
        labeledNodeIds.has(n.id) || (!isLarge && (n.degree ?? 0) >= 3);
      if (shouldLabel) {
        const sprite = new SpriteText(n.name);
        sprite.color = '#e2e8f0';
        sprite.textHeight = Math.max(2.2, n.val * 0.65);
        sprite.position.y = -(n.val + 3);
        sprite.material.depthWrite = false;
        group.add(sprite);
      }

      cache.set(n.id, group);
      return group;
    },
    [colorFor, ensureModules, getGeometry, getMaterial, isLarge, labeledNodeIds],
  );

  // ── Hover handler: split forward + reverse for palindrome viz ──
  // Build per-node forward/reverse edge maps once per graph data
  // change. Hover then just looks them up.
  const directionalAdjacency = useMemo(() => {
    const forward = new Map<string, Set<string>>();
    const reverse = new Map<string, Set<string>>();
    for (const n of graphData.nodes) {
      forward.set(n.id, new Set());
      reverse.set(n.id, new Set());
    }
    for (const l of graphData.links) {
      const s = getNodeId(l.source as string);
      const t = getNodeId(l.target as string);
      const key = `${s}::${t}`;
      forward.get(s)?.add(key);
      reverse.get(t)?.add(key);
    }
    return { forward, reverse };
  }, [graphData.nodes, graphData.links]);

  const handleNodeHover = useCallback(
    (n: object | null) => {
      const node = n as KGNode | null;
      const id = node?.id ?? null;
      if (lastHoveredIdRef.current === id) return;
      lastHoveredIdRef.current = id;
      setHovered(node);
      if (!node) {
        highlightNodesRef.current = new Set();
        highlightForwardLinksRef.current = new Set();
        highlightReverseLinksRef.current = new Set();
      } else {
        highlightNodesRef.current = new Set(
          adjacency.nodes.get(node.id) ?? [node.id],
        );
        highlightForwardLinksRef.current = new Set(
          directionalAdjacency.forward.get(node.id) ?? [],
        );
        highlightReverseLinksRef.current = new Set(
          directionalAdjacency.reverse.get(node.id) ?? [],
        );
      }
      const g = graphRef.current as { refresh?: () => void } | null;
      g?.refresh?.();
    },
    [adjacency.nodes, directionalAdjacency.forward, directionalAdjacency.reverse],
  );

  // ── Color resolvers passed to ForceGraph3D ──
  const resolveNodeColor = useCallback(
    (n: object) => {
      const node = n as KGNode;
      const highlights = highlightNodesRef.current;
      if (highlights.size === 0) return colorFor(node);
      return highlights.has(node.id) ? colorFor(node) : DIM_NODE_COLOR;
    },
    [colorFor],
  );

  // Palindrome viz: forward edges (the offense ladder leaving this
  // node) glow emerald; reverse edges (the defense ladder arriving)
  // glow rose. Other edges dim. Without a hover, fall back to the
  // initiative palette so the graph still shows initiative coloring.
  const FORWARD_EDGE_COLOR = '#10b981';   // emerald — offense
  const REVERSE_EDGE_COLOR = '#f43f5e';   // rose — counter / arriving

  const resolveLinkColor = useCallback(
    (l: object) => {
      const link = l as KGEdge;
      const key = `${getNodeId(link.source as string)}::${getNodeId(link.target as string)}`;
      const fwd = highlightForwardLinksRef.current;
      const rev = highlightReverseLinksRef.current;
      const initiativeColor =
        (link.primary_initiative &&
          edgeInitiativePalette[link.primary_initiative]) ||
        null;
      if (fwd.size === 0 && rev.size === 0) {
        return initiativeColor ?? NEUTRAL_EDGE_COLOR;
      }
      if (fwd.has(key)) return FORWARD_EDGE_COLOR;
      if (rev.has(key)) return REVERSE_EDGE_COLOR;
      return DIM_EDGE_COLOR;
    },
    [edgeInitiativePalette],
  );

  const resolveLinkWidth = useCallback(
    (l: object) => {
      const link = l as KGEdge;
      const key = `${getNodeId(link.source as string)}::${getNodeId(link.target as string)}`;
      const fwd = highlightForwardLinksRef.current;
      const rev = highlightReverseLinksRef.current;
      const w = link.weight ?? 1;
      if (fwd.size === 0 && rev.size === 0) {
        return Math.max(0.6, w * (isLarge ? 1.0 : 1.6));
      }
      if (fwd.has(key) || rev.has(key)) return Math.max(1.6, w * 2.6);
      return 0.2;
    },
    [isLarge],
  );

  // No camera helpers. Click selects (opens side panel when enabled);
  // it does NOT fly the camera. d3 force keeps the graph centered at
  // the origin and the default camera is framed for that — same model
  // as MW's KnowledgeGraph.tsx, which never zoomToFits or flies.
  const handleNodeClick = useCallback(
    (n: object) => {
      const node = n as KGNode;
      if (sidePanelEnabled) {
        setSelectedNodeId(node.id);
      }
      onNodeClick?.(node);
    },
    [onNodeClick, sidePanelEnabled],
  );

  function toggleType(t: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  }

  function refresh() {
    objectCacheRef.current.clear();
    if (onRefresh) onRefresh();
    setRefreshNonce((n) => n + 1);
  }

  // ── States ──
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
          'flex items-center justify-center rounded-md border border-border bg-background/40 p-6 text-center text-sm text-muted-foreground',
          className,
        )}
        style={{ height, background: backgroundColor }}
      >
        No graph data yet — run a fight breakdown and edges will accrete here.
      </div>
    );
  }

  // ── Wrapper styling: fullscreen vs inline ──
  const wrapperClass = cn(
    isFullscreen
      ? 'fixed inset-0 z-50 flex flex-col bg-slate-950'
      : 'relative overflow-hidden rounded-md',
    className,
  );

  return (
    <div
      className={wrapperClass}
      style={isFullscreen ? undefined : { height, background: backgroundColor }}
    >
      {/* ── Top toolbar — MW parity ── */}
      <div
        className={cn(
          'flex items-center justify-between gap-3',
          isFullscreen
            ? 'border-b border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur'
            : 'absolute left-3 right-3 top-3 z-20',
        )}
      >
        {showHeader && (
          <div
            className={cn(
              'flex items-center gap-3 text-xs text-slate-200',
              isFullscreen
                ? ''
                : 'rounded-md border border-white/10 bg-slate-950/80 px-3 py-2 backdrop-blur',
            )}
          >
            <span>
              {graphData.nodes.length} nodes · {graphData.links.length} edges
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-slate-900/70 px-2 py-0.5">
              <Gauge className="h-3 w-3" />
              3D optimized
            </span>
            {isLarge ? (
              <span className="rounded-full border border-amber-700/60 bg-amber-950/40 px-2 py-0.5 text-amber-300">
                Large graph mode
              </span>
            ) : null}
            {isFullscreen ? (
              <span className="text-slate-500">(Esc to exit)</span>
            ) : null}
          </div>
        )}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={refresh}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-950/80 px-3 py-1.5 text-sm text-slate-200 backdrop-blur transition-colors hover:bg-slate-900 hover:text-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen((v) => !v)}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-950/80 px-3 py-1.5 text-sm text-slate-200 backdrop-blur transition-colors hover:bg-slate-900 hover:text-slate-50"
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
            {isFullscreen ? 'Exit' : 'Expand'}
          </button>
        </div>
      </div>

      {/* ── Canvas + overlays ── */}
      <div
        ref={containerRef}
        className={cn(
          'relative overflow-hidden',
          isFullscreen ? 'flex-1' : 'h-full w-full',
        )}
        style={!isFullscreen ? { background: backgroundColor } : undefined}
      >
        {/* Legend — top-right, MW pattern. Click a row to toggle visibility. */}
        {showLegend && Object.keys(typeCounts).length > 0 && (
          <div className="absolute right-3 top-16 z-10 max-h-[70%] overflow-y-auto rounded-lg border border-white/10 bg-slate-950/90 p-2.5 backdrop-blur-sm">
            <div className="mb-1.5 text-xs font-medium text-slate-200">
              Node Types
            </div>
            <div className="space-y-1">
              {Object.keys(typeCounts)
                .sort()
                .map((t) => {
                  const color = nodePalette[t] ?? fallbackColor(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleType(t)}
                      className={cn(
                        'flex w-full items-center gap-2 text-left transition-opacity',
                        hidden.has(t) ? 'opacity-40' : 'opacity-100',
                      )}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: color }}
                      />
                      <span className="text-xs text-slate-100">{t}</span>
                      <span className="ml-auto text-[10px] text-slate-500">
                        {typeCounts[t]}
                      </span>
                    </button>
                  );
                })}
            </div>
            <div className="mt-2.5 mb-1 text-xs font-medium text-slate-200">
              Edge Initiative
            </div>
            <div className="space-y-1">
              {(['lead', 'sim_counter', 'delayed_counter', 'feint'] as const).map(
                (k) => {
                  const labels: Record<string, string> = {
                    lead: 'Lead',
                    sim_counter: 'Sim Counter',
                    delayed_counter: 'Delayed Counter',
                    feint: 'Feint',
                  };
                  return (
                    <div key={k} className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ background: edgeInitiativePalette[k] }}
                      />
                      <span className="text-xs text-slate-100">
                        {labels[k]}
                      </span>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        )}

        {/* Slide-in side panel — per-node edit + per-edge delete */}
        {sidePanelEnabled && selectedNodeId && payload ? (
          <NodeSidePanel
            node={payload.nodes.find((n) => n.id === selectedNodeId) ?? null}
            edges={payload.edges}
            nodes={payload.nodes}
            edgePalette={edgeInitiativePalette}
            onClose={() => setSelectedNodeId(null)}
            onEdgeDelete={onEdgeDelete}
            onEdgeReclassify={onEdgeReclassify}
          />
        ) : null}

        {/* Hover detail card — fixed bottom-left (MW pattern). */}
        {hovered && (
          <div className="absolute bottom-3 left-3 z-20 rounded-lg border border-white/10 bg-slate-950/90 p-2.5 backdrop-blur-sm">
            <div className="text-sm font-medium text-slate-50">
              {hovered.name}
            </div>
            <div className="text-xs text-slate-400">
              Type: {hovered.type}
              {hovered.canonical ? ' · canonical' : ''}
              {hovered.subtitle ? ` · ${hovered.subtitle}` : ''}
            </div>
          </div>
        )}

        <ForceGraph3D
          ref={graphRef as unknown as React.MutableRefObject<undefined>}
          graphData={graphData}
          width={size.width}
          height={isFullscreen ? size.height : height}
          backgroundColor={backgroundColor}
          // Smooth controls — orbit, drag enabled, longer cooldown
          // Trackball camera (default). Click-drag empty space = orbit;
          // right-click-drag = pan; wheel = zoom. With trackball the
          // node-drag conflict that plagued orbit-mode is gone — the
          // lib dispatches based on what the cursor is over, so users
          // can grab and reposition individual nodes without hijacking
          // the camera.
          enableNodeDrag
          enableNavigationControls
          showNavInfo={false}
          // Custom three.js node objects (cached spheres + sprite labels)
          nodeThreeObject={nodeThreeObject as (node: object) => object}
          nodeThreeObjectExtend={false}
          nodeColor={resolveNodeColor}
          nodeOpacity={0.95}
          nodeResolution={isLarge ? 4 : 8}
          nodeLabel={(node: object) => {
            const n = node as KGNode;
            return `${n.name} (${n.type})${n.subtitle ? `\n${n.subtitle}` : ''}`;
          }}
          // Edges
          linkColor={resolveLinkColor}
          linkOpacity={isLarge ? 0.45 : 0.6}
          linkWidth={resolveLinkWidth}
          linkResolution={isLarge ? 2 : 4}
          // Heavier edges spawn flowing particles — adds the gentle
          // motion that signals "this graph is alive" without snapping.
          linkDirectionalParticles={(l: object) =>
            ((l as KGEdge).weight ?? 0) > 0.6 ? 2 : 0
          }
          linkDirectionalParticleSpeed={0.004}
          linkDirectionalParticleWidth={1.6}
          // Layout — flowy d3 profile (matches the canonical skill at
          // ~/.claude/skills/agentic-kg-pipeline/assets/KnowledgeGraph3D.tsx).
          // Slow alpha decay + low velocity decay + long cooldown = the
          // graph keeps gently breathing for a while after a change,
          // nodes you drag glide back into a relaxed equilibrium.
          warmupTicks={20}
          cooldownTicks={isLarge ? 60 : 120}
          d3AlphaDecay={0.025}
          d3VelocityDecay={0.28}
          onNodeHover={handleNodeHover}
          onNodeClick={handleNodeClick}
        />
      </div>
    </div>
  );
}

export default KnowledgeGraph3D;

// ── NodeSidePanel ──────────────────────────────────────────────────
// Slide-in panel showing the selected node's metadata and outbound edges
// grouped by initiative. Per-edge: reclassify dropdown + delete button.
// Mirrors the pattern of MW's KnowledgeRelationships.tsx.

const INITIATIVE_LABELS: Record<Initiative | 'unclassified', string> = {
  lead: 'Lead',
  sim_counter: 'Simultaneous Counter',
  delayed_counter: 'Delayed Counter',
  feint: 'Feint',
  unclassified: 'Unclassified',
};

const INITIATIVE_ORDER: Array<Initiative | 'unclassified'> = [
  'lead',
  'sim_counter',
  'delayed_counter',
  'feint',
  'unclassified',
];

function NodeSidePanel({
  node,
  edges,
  nodes,
  edgePalette,
  onClose,
  onEdgeDelete,
  onEdgeReclassify,
}: {
  node: KGNode | null;
  edges: KGEdge[];
  nodes: KGNode[];
  edgePalette: Record<string, string>;
  onClose: () => void;
  onEdgeDelete?: (edgeId: string) => Promise<void> | void;
  onEdgeReclassify?: (
    edgeId: string,
    initiative: Initiative,
  ) => Promise<void> | void;
}) {
  const [busyEdgeId, setBusyEdgeId] = useState<string | null>(null);
  const nodeMap = useMemo(() => {
    const m = new Map<string, KGNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  if (!node) return null;

  // Outbound + inbound (treat both as "connections" — direction shown in row)
  const outbound = edges.filter((e) => e.source === node.id);
  const inbound = edges.filter((e) => e.target === node.id);
  const grouped: Record<string, Array<{ edge: KGEdge; direction: 'out' | 'in' }>> = {};
  for (const e of outbound) {
    const key = e.primary_initiative ?? 'unclassified';
    (grouped[key] ??= []).push({ edge: e, direction: 'out' });
  }
  for (const e of inbound) {
    const key = e.primary_initiative ?? 'unclassified';
    (grouped[key] ??= []).push({ edge: e, direction: 'in' });
  }

  async function handleDelete(edgeId: string) {
    if (!onEdgeDelete) return;
    if (
      !window.confirm(
        'Delete this edge? Trainers can re-create by re-running an analysis.',
      )
    ) {
      return;
    }
    setBusyEdgeId(edgeId);
    try {
      await onEdgeDelete(edgeId);
    } finally {
      setBusyEdgeId(null);
    }
  }

  async function handleReclassify(edgeId: string, initiative: Initiative) {
    if (!onEdgeReclassify) return;
    setBusyEdgeId(edgeId);
    try {
      await onEdgeReclassify(edgeId, initiative);
    } finally {
      setBusyEdgeId(null);
    }
  }

  const totalConnections = outbound.length + inbound.length;

  return (
    <div className="absolute left-3 top-16 z-30 flex h-[calc(100%-5rem)] w-[340px] flex-col overflow-hidden rounded-md border border-white/15 bg-slate-950/95 text-slate-100 shadow-xl backdrop-blur">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-white/10 px-3 py-2.5">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{node.name}</div>
          <div className="mt-0.5 text-[11px] text-slate-400">
            {node.type}
            {node.subtitle ? ` · ${node.subtitle}` : ''}
            {totalConnections > 0
              ? ` · ${totalConnections} connection${
                  totalConnections === 1 ? '' : 's'
                }`
              : ''}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-900 hover:text-slate-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Edge list, grouped by initiative */}
      <div className="flex-1 overflow-y-auto px-3 py-2 text-xs">
        {totalConnections === 0 ? (
          <p className="py-6 text-center text-slate-500">
            No edges yet. Run an analysis that mentions this technique and the
            graph will start filling in.
          </p>
        ) : (
          INITIATIVE_ORDER.map((key) => {
            const items = grouped[key];
            if (!items?.length) return null;
            const swatch =
              key !== 'unclassified'
                ? edgePalette[key] ?? edgePalette.default
                : edgePalette.default;
            return (
              <div key={key} className="mb-3">
                <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <span
                    className="h-2 w-2 rounded-sm"
                    style={{ background: swatch }}
                  />
                  {INITIATIVE_LABELS[key]} · {items.length}
                </div>
                <div className="space-y-1">
                  {items.map(({ edge, direction }) => {
                    const otherId =
                      direction === 'out' ? edge.target : edge.source;
                    const other = nodeMap.get(otherId as string);
                    const otherName = other?.name ?? otherId;
                    const arrow = direction === 'out' ? '→' : '←';
                    const isBusy = busyEdgeId === (edge as { id?: string }).id;
                    const edgeId = (edge as { id?: string }).id ?? '';
                    return (
                      <div
                        key={edgeId || `${edge.source}-${edge.target}`}
                        className="flex items-center gap-2 rounded-md border border-white/10 bg-slate-900/60 px-2 py-1.5"
                      >
                        <span className="text-slate-500">{arrow}</span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm text-slate-100">
                            {otherName}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {edge.type}
                            {edge.weight != null
                              ? ` · w ${edge.weight.toFixed(2)}`
                              : ''}
                            {edge.frequency != null
                              ? ` · ×${edge.frequency}`
                              : ''}
                          </div>
                        </div>
                        {onEdgeReclassify && edgeId ? (
                          <select
                            value={edge.primary_initiative ?? ''}
                            disabled={isBusy}
                            onChange={(ev) => {
                              const val = ev.target.value as
                                | Initiative
                                | '';
                              if (val) handleReclassify(edgeId, val);
                            }}
                            className="rounded border border-white/15 bg-slate-950 px-1 py-0.5 text-[10px] text-slate-100"
                            title="Reclassify initiative"
                          >
                            <option value="">—</option>
                            <option value="lead">Lead</option>
                            <option value="sim_counter">Sim</option>
                            <option value="delayed_counter">Del</option>
                            <option value="feint">Feint</option>
                          </select>
                        ) : null}
                        {onEdgeDelete && edgeId ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(edgeId)}
                            disabled={isBusy}
                            className="rounded p-1 text-rose-300 transition-colors hover:bg-rose-500/10 hover:text-rose-200 disabled:opacity-40"
                          >
                            {isBusy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
