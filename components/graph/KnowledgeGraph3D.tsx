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
  type MouseEvent as ReactMouseEvent,
} from 'react';
import dynamic from 'next/dynamic';
import {
  Maximize2,
  Minimize2,
  RefreshCw,
  RotateCcw,
  Focus,
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
  showLegend?: boolean;
  showHeader?: boolean;
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
const HIGHLIGHT_EDGE_COLOR = '#cbd5e1';

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
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
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
  const highlightNodesRef = useRef<Set<string>>(new Set());
  const highlightLinksRef = useRef<Set<string>>(new Set());
  const lastHoveredIdRef = useRef<string | null>(null);

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

  // ── Hover handler: dim non-connected, brighten neighborhood ──
  const handleNodeHover = useCallback(
    (n: object | null) => {
      const node = n as KGNode | null;
      const id = node?.id ?? null;
      if (lastHoveredIdRef.current === id) return;
      lastHoveredIdRef.current = id;
      setHovered(node);
      if (!node) {
        highlightNodesRef.current = new Set();
        highlightLinksRef.current = new Set();
      } else {
        highlightNodesRef.current = new Set(
          adjacency.nodes.get(node.id) ?? [node.id],
        );
        highlightLinksRef.current = new Set(adjacency.links.get(node.id) ?? []);
      }
      const g = graphRef.current as { refresh?: () => void } | null;
      g?.refresh?.();
    },
    [adjacency.links, adjacency.nodes],
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

  const resolveLinkColor = useCallback(
    (l: object) => {
      const link = l as KGEdge;
      const key = `${getNodeId(link.source as string)}::${getNodeId(link.target as string)}`;
      const highlights = highlightLinksRef.current;
      const initiativeColor =
        (link.primary_initiative &&
          edgeInitiativePalette[link.primary_initiative]) ||
        null;
      if (highlights.size === 0) {
        return initiativeColor ?? NEUTRAL_EDGE_COLOR;
      }
      if (highlights.has(key)) {
        return initiativeColor ?? HIGHLIGHT_EDGE_COLOR;
      }
      return DIM_EDGE_COLOR;
    },
    [edgeInitiativePalette],
  );

  const resolveLinkWidth = useCallback(
    (l: object) => {
      const link = l as KGEdge;
      const key = `${getNodeId(link.source as string)}::${getNodeId(link.target as string)}`;
      const highlights = highlightLinksRef.current;
      const w = link.weight ?? 1;
      if (highlights.size === 0) {
        return Math.max(0.6, w * (isLarge ? 1.0 : 1.6));
      }
      return highlights.has(key) ? Math.max(1.4, w * 2.4) : 0.2;
    },
    [isLarge],
  );

  // ── Camera helpers ──
  function fitView(ms = 800) {
    const g = graphRef.current as
      | { zoomToFit?: (ms?: number, padding?: number) => void }
      | null;
    g?.zoomToFit?.(ms, 60);
  }
  function flyToNode(
    node: KGNode & { x?: number; y?: number; z?: number },
  ) {
    const g = graphRef.current as
      | {
          cameraPosition?: (
            pos: { x: number; y: number; z: number },
            lookAt?: { x: number; y: number; z: number },
            ms?: number,
          ) => void;
        }
      | null;
    if (!g?.cameraPosition || node.x == null || node.y == null || node.z == null)
      return;
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

  const handleEngineStop = useCallback(() => {
    fitView(600);
  }, []);

  const handleNodeClick = useCallback(
    (n: object) => {
      const node = n as KGNode & { x?: number; y?: number; z?: number };
      flyToNode(node);
      onNodeClick?.(node);
    },
    [onNodeClick],
  );

  function handleMouseMove(e: ReactMouseEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

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
      {/* ── Top toolbar ── */}
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
              'flex items-center gap-2 text-xs text-slate-200',
              isFullscreen
                ? ''
                : 'rounded-md border border-white/10 bg-slate-950/80 px-3 py-2 backdrop-blur',
            )}
          >
            <span className="font-semibold">
              {(payload.metadata?.project as string) ?? 'Knowledge Graph'}
            </span>
            <span className="text-slate-400">
              · {graphData.nodes.length} nodes · {graphData.links.length} edges
            </span>
            {isLarge ? (
              <span className="rounded-full border border-amber-700/60 bg-amber-950/40 px-2 py-0.5 text-[10px] text-amber-300">
                large mode
              </span>
            ) : null}
            {isFullscreen ? (
              <span className="text-slate-500">(Esc to exit)</span>
            ) : null}
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={refresh}
            title="Refresh graph data"
            className="rounded-md border border-white/10 bg-slate-950/80 p-1.5 text-slate-100 backdrop-blur transition-colors hover:bg-slate-900"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => fitView(800)}
            title="Fit to view"
            className="rounded-md border border-white/10 bg-slate-950/80 p-1.5 text-slate-100 backdrop-blur transition-colors hover:bg-slate-900"
          >
            <Focus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => fitView(0)}
            title="Reset camera"
            className="rounded-md border border-white/10 bg-slate-950/80 p-1.5 text-slate-100 backdrop-blur transition-colors hover:bg-slate-900"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen((v) => !v)}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            className="rounded-md border border-white/10 bg-slate-950/80 p-1.5 text-slate-100 backdrop-blur transition-colors hover:bg-slate-900"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
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
        onMouseMove={handleMouseMove}
        style={!isFullscreen ? { background: backgroundColor } : undefined}
      >
        {/* Legend */}
        {showLegend && Object.keys(typeCounts).length > 0 && (
          <div className="absolute bottom-3 right-3 z-10 max-h-[60%] overflow-y-auto rounded-md border border-white/10 bg-slate-950/85 px-3 py-2 text-[11px] text-slate-100 backdrop-blur">
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Nodes · click to toggle
            </div>
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
                      'flex w-full items-center gap-2 py-0.5 text-left',
                      hidden.has(t) ? 'opacity-40' : 'opacity-100',
                    )}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: color }}
                    />
                    <span>{t}</span>
                    <span className="ml-auto text-slate-500">
                      {typeCounts[t]}
                    </span>
                  </button>
                );
              })}

            <div className="mt-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Edges · initiative
            </div>
            {(['lead', 'sim_counter', 'delayed_counter', 'feint'] as const).map(
              (k) => {
                const labels: Record<string, string> = {
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

        {/* Cursor-following hover tooltip */}
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

        <ForceGraph3D
          ref={graphRef as unknown as React.MutableRefObject<undefined>}
          graphData={graphData}
          width={size.width}
          height={isFullscreen ? size.height : height}
          backgroundColor={backgroundColor}
          // Smooth controls — orbit, drag enabled, longer cooldown
          controlType="orbit"
          enableNodeDrag
          enableNavigationControls
          showNavInfo={false}
          // Custom three.js node objects (cached spheres + sprite labels)
          nodeThreeObject={nodeThreeObject as (node: object) => object}
          nodeThreeObjectExtend={false}
          nodeColor={resolveNodeColor}
          nodeOpacity={0.95}
          nodeResolution={isLarge ? 4 : 8}
          nodeLabel={() => ''}
          // Edges
          linkColor={resolveLinkColor}
          linkOpacity={isLarge ? 0.45 : 0.6}
          linkWidth={resolveLinkWidth}
          linkResolution={isLarge ? 2 : 4}
          linkDirectionalParticles={(l: object) =>
            ((l as KGEdge).weight ?? 0) > 0.6 ? 2 : 0
          }
          linkDirectionalParticleSpeed={0.004}
          linkDirectionalParticleWidth={1.6}
          // Layout — settles smoothly without freezing
          warmupTicks={20}
          cooldownTicks={isLarge ? 60 : 120}
          d3AlphaDecay={0.025}
          d3VelocityDecay={0.28}
          onEngineStop={handleEngineStop}
          onNodeHover={handleNodeHover}
          onNodeClick={handleNodeClick}
        />
      </div>
    </div>
  );
}

export default KnowledgeGraph3D;
