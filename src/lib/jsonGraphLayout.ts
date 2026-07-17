import dagre from 'dagre'
import { buildJsonPath, type PathSegment } from './jsonPath'

export type GraphRowKind = 'primitive' | 'array' | 'object'

export interface GraphNodeRow {
  key: string
  path: string
  kind: GraphRowKind
  value?: unknown
  childId?: string
  count?: number
}

export interface GraphCardData {
  rows: GraphNodeRow[]
}

export interface GraphNode {
  id: string
  type: 'card'
  position: { x: number; y: number }
  data: GraphCardData
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  /** Row-level handle id on the source card — the edge starts at the exact key row. */
  sourceHandle: string
}

export interface JsonGraphLayoutResult {
  nodes: GraphNode[]
  edges: GraphEdge[]
  truncated: boolean
}

export const MAX_NODES = 300
export const CARD_WIDTH = 220
export const ROW_HEIGHT = 24
export const HEADER_HEIGHT = 12

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

interface PendingCard {
  id: string
  segments: PathSegment[]
  value: Record<string, unknown> | unknown[]
}

function buildCards(root: unknown): { cards: Map<string, GraphNodeRow[]>; edges: GraphEdge[]; truncated: boolean } {
  const cards = new Map<string, GraphNodeRow[]>()
  const edges: GraphEdge[] = []
  let truncated = false

  if (!isPlainObject(root) && !Array.isArray(root)) {
    cards.set('$', [{ key: '$', path: '$', kind: 'primitive', value: root }])
    return { cards, edges, truncated }
  }

  const queue: PendingCard[] = [{ id: '$', segments: [], value: root as Record<string, unknown> | unknown[] }]

  while (queue.length > 0) {
    const { id, segments, value } = queue.shift() as PendingCard
    const entries: (readonly [PathSegment, unknown])[] = Array.isArray(value)
      ? value.map((v, i) => [i, v] as const)
      : Object.entries(value)
    const rows: GraphNodeRow[] = []

    for (const [rawKey, val] of entries) {
      const segPath = [...segments, rawKey]
      const path = buildJsonPath(segPath)
      const key = String(rawKey)

      if (Array.isArray(val) || isPlainObject(val)) {
        const count = Array.isArray(val) ? val.length : Object.keys(val).length
        const kind: GraphRowKind = Array.isArray(val) ? 'array' : 'object'

        if (cards.size + queue.length + 1 < MAX_NODES) {
          rows.push({ key, path, kind, count, childId: path })
          edges.push({ id: `${id}->${path}`, source: id, target: path, sourceHandle: path })
          queue.push({ id: path, segments: segPath, value: val as Record<string, unknown> | unknown[] })
        } else {
          rows.push({ key, path, kind, count })
          truncated = true
        }
      } else {
        rows.push({ key, path, kind: 'primitive', value: val })
      }
    }

    cards.set(id, rows)
  }

  return { cards, edges, truncated }
}

export function computeJsonGraphLayout(value: unknown): JsonGraphLayoutResult {
  const { cards, edges, truncated } = buildCards(value)

  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 80 })
  g.setDefaultEdgeLabel(() => ({}))

  for (const [id, rows] of cards) {
    g.setNode(id, { width: CARD_WIDTH, height: HEADER_HEIGHT + rows.length * ROW_HEIGHT })
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target)
  }

  dagre.layout(g)

  const nodes: GraphNode[] = [...cards.entries()].map(([id, rows]) => {
    const pos = g.node(id)
    return {
      id,
      type: 'card',
      position: { x: pos.x - pos.width / 2, y: pos.y - pos.height / 2 },
      data: { rows },
    }
  })

  return { nodes, edges, truncated }
}
