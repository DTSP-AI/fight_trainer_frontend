'use client';

/**
 * KnowledgeGraph3D — drop-in React component for any agentic-kg-pipeline project.
 *
 * Schema contract: assets/kg_schema.json (matches the standalone graph_viewer.html).
 *
 * Usage (Next.js 13+ / 16):
 *   import { KnowledgeGraph3D } from '@/components/KnowledgeGraph3D';
 *   <KnowledgeGraph3D fetchUrl="/api/v1/knowledge-graph" />
 *   // or
 *   <KnowledgeGraph3D data={{ nodes, edges }} />
 *
 * Requires: `pnpm add react-force-graph-3d three` (or npm/yarn equivalent).
 *
 * SSR-safe via dynamic import — react-force-graph-3d cannot render server-side.
 */

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false });

// ── Types matching kg_schema.json ─────────────────────────────────

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
  extraction_source?: string;
  [key: string]: unknown;
}

export interface KGPayload {
  nodes: KGNode[];
  edges: KGEdge[];
  palette?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeGraph3DProps {
  /** Direct payload. Mutually exclusive with `fetchUrl`. */
  data?: KGPayload;
  /** Endpoint that returns the KG payload. Re-fetched when `refreshKey` changes. */
  fetchUrl?: string;
  /** Increment to force a re-fetch. */
  refreshKey?: number | string;
  /** Override or extend the default type→color palette. */
  palette?: Record<string, string>;
  /** Pixel height. Default 500. */
  height?: number;
  /** Background color. Default "#030712". */
  backgroundColor?: string;
  /** Called when a node is clicked. */
  onNodeClick?: (node: KGNode) => void;
  /** Show the inline legend. Default true. */
  showLegend?: boolean;
  /** Show the header (project, stats). Default true. */
  showHeader?: boolean;
  /** Optional className applied to the root wrapper. */
  className?: string;
  /** Optional auth header for fetchUrl (e.g., bearer token). */
  authHeader?: string;
}

// ── Default palette (extend per-project via `palette` prop) ────────

const DEFAULT_PALETTE: Record<string, string> = {
  Organization: '#c084fc',
  Person: '#60a5fa',
  Product: '#4ade80',
  Feature: '#34d399',
  UseCase: '#a78bfa',
  Policy: '#fb923c',
  Regulation: '#f59e0b',
  Technology: '#22d3ee',
  Concept: '#facc15',
  Market: '#f97316',
  Objection: '#f87171',
  Pricing: '#fbbf24',
  Stack: '#8b5cf6',
  Integration: '#2dd4bf',
  Category: '#e879f9',
  Competitor: '#ef4444',
  Event: '#f472b6',
  Location: '#9ca3af',
  Unknown: '#6b7280',
};

const LARGE_GRAPH_NODE_THRESHOLD = 140;
const LARGE_GRAPH_EDGE_THRESHOLD = 260;

// ── Component ──────────────────────────────────────────────────────

export function KnowledgeGraph3D({
  data,
  fetchUrl,
  refreshKey,
  palette,
  height = 500,
  backgroundColor = '#030712',
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
  const [size, setSize] = useState({ width: 800, height });
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<unknown>(null);

  const mergedPalette = useMemo(
    () => ({ ...DEFAULT_PALETTE, ...(payload?.palette ?? {}), ...(palette ?? {}) }),
    [palette, payload?.palette],
  );

  // Fetch payload if fetchUrl is provided
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

  // Track container size for responsive rendering
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

  // Build derived graph data — filter hidden types, compute degree
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
        val: Math.max(2.5, Math.min(9, 2.5 + Math.sqrt(degree[n.id] ?? 0) * 0.9)) * (n.canonical ? 1.4 : 1),
        color: mergedPalette[n.type] ?? mergedPalette.Unknown,
      })),
      links: payload.edges
        .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
        .map((e) => ({
          source: e.source,
          target: e.target,
          type: e.type,
          weight: e.weight ?? 1,
          frequency: e.frequency,
        })),
    };
  }, [payload, hidden, mergedPalette]);

  const isLarge =
    graphData.nodes.length > LARGE_GRAPH_NODE_THRESHOLD ||
    graphData.links.length > LARGE_GRAPH_EDGE_THRESHOLD;

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

  const handleNodeClick = useCallback(
    (n: object) => {
      onNodeClick?.(n as KGNode);
    },
    [onNodeClick],
  );

  if (loading) {
    return (
      <div
        ref={containerRef}
        className={className}
        style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: backgroundColor, color: '#9ca3af', fontSize: 13 }}
      >
        Loading graph...
      </div>
    );
  }

  if (error) {
    return (
      <div
        ref={containerRef}
        className={className}
        style={{ height, padding: 16, background: backgroundColor, color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8 }}
      >
        Failed to load graph: {error}
      </div>
    );
  }

  if (!payload || payload.nodes.length === 0) {
    return (
      <div
        ref={containerRef}
        className={className}
        style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: backgroundColor, color: '#9ca3af', fontSize: 13 }}
      >
        No graph data
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className} style={{ position: 'relative', height, background: backgroundColor, borderRadius: 8, overflow: 'hidden' }}>
      {showHeader && (
        <div
          style={{
            position: 'absolute', top: 12, left: 12, zIndex: 2,
            background: 'rgba(15,23,42,0.92)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#e5e7eb',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ fontWeight: 600 }}>{(payload.metadata?.project as string) ?? 'Knowledge Graph'}</div>
          <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 2 }}>
            {graphData.nodes.length} nodes · {graphData.links.length} edges{isLarge ? ' · large mode' : ''}
          </div>
        </div>
      )}

      {showLegend && Object.keys(typeCounts).length > 0 && (
        <div
          style={{
            position: 'absolute', top: 12, right: 12, zIndex: 2,
            background: 'rgba(15,23,42,0.92)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#e5e7eb',
            backdropFilter: 'blur(8px)', maxHeight: '60%', overflowY: 'auto',
          }}
        >
          <div style={{ color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, fontWeight: 600 }}>
            Entity Types
          </div>
          {Object.keys(typeCounts).sort().map((t) => (
            <div
              key={t}
              onClick={() => toggleType(t)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0',
                cursor: 'pointer', userSelect: 'none',
                opacity: hidden.has(t) ? 0.35 : 1,
              }}
            >
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                background: mergedPalette[t] ?? mergedPalette.Unknown,
              }} />
              <span>{t}</span>
              <span style={{ marginLeft: 'auto', color: '#6b7280' }}>{typeCounts[t]}</span>
            </div>
          ))}
        </div>
      )}

      {hovered && (
        <div
          style={{
            position: 'absolute', bottom: 12, left: 12, zIndex: 2,
            background: 'rgba(15,23,42,0.96)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, padding: '8px 10px', fontSize: 12, color: '#e5e7eb',
            backdropFilter: 'blur(8px)', maxWidth: 320,
          }}
        >
          <div style={{ fontWeight: 600 }}>{hovered.name}</div>
          <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 2 }}>
            {hovered.type}{hovered.canonical ? ' · canonical' : ''}
          </div>
          {hovered.subtitle && <div style={{ marginTop: 4, fontSize: 11 }}>{hovered.subtitle}</div>}
        </div>
      )}

      <ForceGraph3D
        ref={graphRef as unknown as React.MutableRefObject<undefined>}
        graphData={graphData}
        width={size.width}
        height={height}
        backgroundColor={backgroundColor}
        nodeOpacity={0.95}
        nodeResolution={isLarge ? 4 : 6}
        nodeColor={(n: object) => (n as KGNode & { color: string }).color}
        nodeLabel={(n: object) => {
          const node = n as KGNode;
          return `${node.name} (${node.type})`;
        }}
        linkOpacity={isLarge ? 0.22 : 0.35}
        linkWidth={(l: object) => Math.max(0.5, ((l as KGEdge).weight ?? 1) * 0.8)}
        linkResolution={isLarge ? 2 : 4}
        warmupTicks={isLarge ? 8 : 18}
        cooldownTicks={isLarge ? 12 : 28}
        d3AlphaDecay={isLarge ? 0.2 : 0.14}
        d3VelocityDecay={0.4}
        enableNodeDrag={false}
        enableNavigationControls
        showNavInfo={false}
        onNodeHover={(n: object | null) => setHovered(n as KGNode | null)}
        onNodeClick={handleNodeClick}
      />
    </div>
  );
}

export default KnowledgeGraph3D;
