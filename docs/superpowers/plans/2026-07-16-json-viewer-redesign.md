# JSON Viewer Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the JSON Viewer's Editor tab with four preview modes (Tree-as-graph, Table, Text, Chart), a compact icon toolbar, a shared search bar with match count, and copy-action toast feedback, per `docs/superpowers/specs/2026-07-16-json-viewer-redesign-design.md`.

**Architecture:** The Editor tab keeps its Monaco editor on the left. The right side becomes a Preview panel with an icon-switcher header (Tree/Table/Text/Chart) and a shared search input showing a live match count. The 8-button text toolbar above the editor becomes a grouped icon toolbar. A toast notification confirms copy actions across all views. Compare tab is untouched.

**Tech Stack:** `@xyflow/react` + `dagre` (Tree graph layout), `recharts` (Chart view), `lucide-react` (icons). React/TypeScript/Tailwind/Monaco as established in Phase 1/2.

## Global Constraints

- TypeScript strict mode (`"strict": true`) across the whole project.
- No secrets/tokens hardcoded anywhere (not applicable to this feature set).
- New files live in `src/lib/` (pure logic) or `src/tools/json-viewer/` (UI) — do not touch `src/tools/api-client/`.
- Pure logic modules get unit tests; UI composition components are verified manually (per Phase 1/2 convention), unless they contain real branching/timing logic worth a unit test (e.g. `useToast`'s auto-dismiss).
- `JsonTree.tsx` (`src/components/JsonTree.tsx`) stays unmodified — it's still used by `JsonPathPanel` to render query-result values.

---

## File Structure

```
src/lib/
  jsonSearch.ts          (+ jsonSearch.test.ts)
  jsonGraphLayout.ts      (+ jsonGraphLayout.test.ts)
  jsonTableRows.ts         (+ jsonTableRows.test.ts)
  jsonChartData.ts          (+ jsonChartData.test.ts)
src/tools/json-viewer/
  GraphNode.tsx              — custom React Flow node card
  GraphView.tsx               — React Flow canvas wrapper
  TableView.tsx                 — recursive table renderer
  TextView.tsx                    — read-only Monaco mirror
  ChartView.tsx                     — Recharts wrapper + axis pickers
  useToast.ts                        (+ useToast.test.ts)
  Toast.tsx                           — toast notification list
  IconToolbar.tsx                      — replaces the 8-button toolbar
  ConvertModal.tsx (modified)           — adds onCopied callback
  JsonViewerPage.tsx (modified)          — wires everything together
```

---

### Task 1: Shared JSON search logic

**Files:**
- Create: `src/lib/jsonSearch.ts`
- Test: `src/lib/jsonSearch.test.ts`

**Interfaces:**
- Produces: `matchesText(text: string, query: string): boolean`; `countJsonMatches(value: unknown, query: string): number`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/jsonSearch.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { matchesText, countJsonMatches } from './jsonSearch'

describe('matchesText', () => {
  it('matches case-insensitively', () => {
    expect(matchesText('Hello World', 'world')).toBe(true)
  })

  it('returns false for an empty query', () => {
    expect(matchesText('Hello', '')).toBe(false)
  })

  it('returns false when there is no match', () => {
    expect(matchesText('Hello', 'xyz')).toBe(false)
  })
})

describe('countJsonMatches', () => {
  it('returns 0 for an empty query', () => {
    expect(countJsonMatches({ a: 1 }, '')).toBe(0)
  })

  it('counts a matching top-level key', () => {
    expect(countJsonMatches({ hello: 1, other: 2 }, 'hello')).toBe(1)
  })

  it('counts a matching primitive value', () => {
    expect(countJsonMatches({ a: 'findme' }, 'findme')).toBe(1)
  })

  it('counts key and value matches separately', () => {
    expect(countJsonMatches({ findme: 'findme' }, 'findme')).toBe(2)
  })

  it('recurses into nested objects and arrays', () => {
    const value = { a: { b: [{ c: 'findme' }] } }
    expect(countJsonMatches(value, 'findme')).toBe(1)
  })

  it('sums multiple matches across siblings', () => {
    const value = [{ name: 'foo' }, { name: 'foobar' }, { name: 'baz' }]
    expect(countJsonMatches(value, 'foo')).toBe(2)
  })

  it('matches a primitive root value', () => {
    expect(countJsonMatches('findme', 'findme')).toBe(1)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/lib/jsonSearch.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/lib/jsonSearch.ts`**

```ts
export function matchesText(text: string, query: string): boolean {
  if (!query) return false
  return text.toLowerCase().includes(query.toLowerCase())
}

export function countJsonMatches(value: unknown, query: string): number {
  if (!query) return 0

  let count = 0

  function visit(keyLabel: string | null, val: unknown): void {
    if (keyLabel !== null && matchesText(keyLabel, query)) count++

    if (val !== null && typeof val === 'object') {
      if (Array.isArray(val)) {
        val.forEach((v, i) => visit(String(i), v))
      } else {
        Object.entries(val).forEach(([k, v]) => visit(k, v))
      }
    } else if (matchesText(JSON.stringify(val), query)) {
      count++
    }
  }

  visit(null, value)
  return count
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/jsonSearch.test.ts`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/jsonSearch.ts src/lib/jsonSearch.test.ts
git commit -m "Add shared JSON search matching/counting logic"
```

---

### Task 2: Graph layout logic (Tree view data)

**Files:**
- Create: `src/lib/jsonGraphLayout.ts`
- Test: `src/lib/jsonGraphLayout.test.ts`

**Interfaces:**
- Consumes: `buildJsonPath`, `type PathSegment` (`src/lib/jsonPath.ts`)
- Produces: `computeJsonGraphLayout(value: unknown): JsonGraphLayoutResult`; types `GraphRowKind`, `GraphNodeRow`, `GraphCardData`, `GraphNode`, `GraphEdge`, `JsonGraphLayoutResult`; constants `MAX_NODES`, `CARD_WIDTH`, `ROW_HEIGHT`, `HEADER_HEIGHT`

- [ ] **Step 1: Install `dagre`**

```bash
npm install dagre
npm install -D @types/dagre
```

- [ ] **Step 2: Write the failing tests**

Create `src/lib/jsonGraphLayout.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { computeJsonGraphLayout, MAX_NODES } from './jsonGraphLayout'

describe('computeJsonGraphLayout', () => {
  it('returns a single card for a primitive root', () => {
    const result = computeJsonGraphLayout(42)
    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0].data.rows).toEqual([{ key: '$', path: '$', kind: 'primitive', value: 42 }])
    expect(result.edges).toEqual([])
  })

  it('builds one card with primitive rows for a flat object', () => {
    const result = computeJsonGraphLayout({ a: 1, b: 'x' })
    expect(result.nodes).toHaveLength(1)
    const [card] = result.nodes
    expect(card.data.rows).toEqual([
      { key: 'a', path: 'a', kind: 'primitive', value: 1 },
      { key: 'b', path: 'b', kind: 'primitive', value: 'x' },
    ])
  })

  it('creates a child card and edge for a nested object', () => {
    const result = computeJsonGraphLayout({ address: { city: 'HCM' } })
    expect(result.nodes).toHaveLength(2)
    const root = result.nodes.find((n) => n.id === '$')
    const child = result.nodes.find((n) => n.id === 'address')
    expect(root?.data.rows).toEqual([{ key: 'address', path: 'address', kind: 'object', count: 1, childId: 'address' }])
    expect(child?.data.rows).toEqual([{ key: 'city', path: 'address.city', kind: 'primitive', value: 'HCM' }])
    expect(result.edges).toEqual([{ id: '$->address', source: '$', target: 'address' }])
  })

  it('marks array rows with kind "array" and index-based child paths', () => {
    const result = computeJsonGraphLayout({ tags: [{ n: 1 }] })
    const root = result.nodes.find((n) => n.id === '$')
    expect(root?.data.rows).toEqual([{ key: 'tags', path: 'tags', kind: 'array', count: 1, childId: 'tags' }])
    const child = result.nodes.find((n) => n.id === 'tags')
    expect(child?.data.rows).toEqual([{ key: '0', path: 'tags[0]', kind: 'object', count: 1, childId: 'tags[0]' }])
  })

  it('is not truncated for small input', () => {
    const result = computeJsonGraphLayout({ a: 1 })
    expect(result.truncated).toBe(false)
  })

  it('truncates and stops creating child cards once the node cap is reached', () => {
    const value = Array.from({ length: 400 }, (_, i) => ({ id: i, nested: { x: i } }))
    const result = computeJsonGraphLayout(value)
    expect(result.truncated).toBe(true)
    expect(result.nodes.length).toBeLessThanOrEqual(MAX_NODES)
    const root = result.nodes.find((n) => n.id === '$')
    const untruncatedRow = root?.data.rows.find((r) => r.childId)
    const truncatedRow = root?.data.rows.find((r) => r.kind === 'object' && !r.childId)
    expect(untruncatedRow).toBeDefined()
    expect(truncatedRow).toBeDefined()
  })

  it('assigns non-overlapping positions computed by dagre', () => {
    const result = computeJsonGraphLayout({ address: { city: 'HCM' } })
    const [a, b] = result.nodes
    expect(a.position).not.toEqual(b.position)
  })
})
```

- [ ] **Step 3: Run to confirm failure**

Run: `npx vitest run src/lib/jsonGraphLayout.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Implement `src/lib/jsonGraphLayout.ts`**

```ts
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

        if (cards.size + queue.length < MAX_NODES) {
          rows.push({ key, path, kind, count, childId: path })
          edges.push({ id: `${id}->${path}`, source: id, target: path })
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/jsonGraphLayout.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 6: Commit**

```bash
git add src/lib/jsonGraphLayout.ts src/lib/jsonGraphLayout.test.ts package.json package-lock.json
git commit -m "Add JSON graph layout logic for Tree view"
```

---

### Task 3: Table rows logic (Table view data)

**Files:**
- Create: `src/lib/jsonTableRows.ts`
- Test: `src/lib/jsonTableRows.test.ts`

**Interfaces:**
- Consumes: `buildJsonPath`, `type PathSegment` (`src/lib/jsonPath.ts`)
- Produces: `computeTableShape(value: unknown): TableShape`; types `TableCellValue`, `TableSubRow`, `TableColumn`, `TableRow`, `TableShape`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/jsonTableRows.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { computeTableShape } from './jsonTableRows'

describe('computeTableShape', () => {
  it('builds object-array shape with the union of keys as columns', () => {
    const shape = computeTableShape([{ a: 1, b: 2 }, { a: 3, c: 4 }])
    expect(shape.kind).toBe('object-array')
    if (shape.kind !== 'object-array') throw new Error('unreachable')
    expect(shape.columns.map((c) => c.key)).toEqual(['a', 'b', 'c'])
    expect(shape.rows).toHaveLength(2)
    expect(shape.rows[0].cells.a).toEqual({ kind: 'primitive', value: 1 })
    expect(shape.rows[1].cells.b).toEqual({ kind: 'primitive', value: undefined })
  })

  it('renders a nested object cell as an inline sub-table', () => {
    const shape = computeTableShape([{ address: { city: 'HCM', country: 'VN' } }])
    if (shape.kind !== 'object-array') throw new Error('unreachable')
    const cell = shape.rows[0].cells.address
    expect(cell.kind).toBe('nested')
    if (cell.kind !== 'nested') throw new Error('unreachable')
    expect(cell.rows).toEqual([
      { key: 'city', path: '[0].address.city', cell: { kind: 'primitive', value: 'HCM' } },
      { key: 'country', path: '[0].address.country', cell: { kind: 'primitive', value: 'VN' } },
    ])
  })

  it('renders a nested array cell as an inline sub-table with index keys', () => {
    const shape = computeTableShape([{ skills: ['a', 'b'] }])
    if (shape.kind !== 'object-array') throw new Error('unreachable')
    const cell = shape.rows[0].cells.skills
    if (cell.kind !== 'nested') throw new Error('unreachable')
    expect(cell.rows).toEqual([
      { key: '0', path: '[0].skills[0]', cell: { kind: 'primitive', value: 'a' } },
      { key: '1', path: '[0].skills[1]', cell: { kind: 'primitive', value: 'b' } },
    ])
  })

  it('builds key-value shape for a single object', () => {
    const shape = computeTableShape({ a: 1, b: 2 })
    expect(shape.kind).toBe('key-value')
    if (shape.kind !== 'key-value') throw new Error('unreachable')
    expect(shape.rows).toEqual([
      { key: 'a', path: 'a', cell: { kind: 'primitive', value: 1 } },
      { key: 'b', path: 'b', cell: { kind: 'primitive', value: 2 } },
    ])
  })

  it('builds index-value shape for an array of primitives', () => {
    const shape = computeTableShape(['x', 'y'])
    expect(shape.kind).toBe('index-value')
    if (shape.kind !== 'index-value') throw new Error('unreachable')
    expect(shape.rows).toEqual([
      { key: '0', path: '[0]', cell: { kind: 'primitive', value: 'x' } },
      { key: '1', path: '[1]', cell: { kind: 'primitive', value: 'y' } },
    ])
  })

  it('builds index-value shape for an empty array', () => {
    const shape = computeTableShape([])
    expect(shape).toEqual({ kind: 'index-value', rows: [] })
  })

  it('builds a single-row key-value shape for a primitive root', () => {
    const shape = computeTableShape(42)
    expect(shape).toEqual({ kind: 'key-value', rows: [{ key: '$', path: '$', cell: { kind: 'primitive', value: 42 } }] })
  })
})
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/lib/jsonTableRows.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/lib/jsonTableRows.ts`**

```ts
import { buildJsonPath, type PathSegment } from './jsonPath'

export type TableCellValue =
  | { kind: 'primitive'; value: unknown }
  | { kind: 'nested'; rows: TableSubRow[] }

export interface TableSubRow {
  key: string
  path: string
  cell: TableCellValue
}

export interface TableColumn {
  key: string
}

export interface TableRow {
  id: string
  cells: Record<string, TableCellValue>
}

export type TableShape =
  | { kind: 'object-array'; columns: TableColumn[]; rows: TableRow[] }
  | { kind: 'key-value'; rows: TableSubRow[] }
  | { kind: 'index-value'; rows: TableSubRow[] }

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function toCell(value: unknown, segments: PathSegment[]): TableCellValue {
  if (value !== null && typeof value === 'object') {
    const entries: (readonly [PathSegment, unknown])[] = Array.isArray(value)
      ? value.map((v, i) => [i, v] as const)
      : Object.entries(value)

    return {
      kind: 'nested',
      rows: entries.map(([key, v]) => ({
        key: String(key),
        path: buildJsonPath([...segments, key]),
        cell: toCell(v, [...segments, key]),
      })),
    }
  }

  return { kind: 'primitive', value }
}

export function computeTableShape(value: unknown): TableShape {
  if (Array.isArray(value) && value.length > 0 && value.every(isPlainObject)) {
    const objects = value as Record<string, unknown>[]
    const columnKeys: string[] = []
    for (const obj of objects) {
      for (const key of Object.keys(obj)) {
        if (!columnKeys.includes(key)) columnKeys.push(key)
      }
    }

    const rows: TableRow[] = objects.map((obj, i) => ({
      id: String(i),
      cells: Object.fromEntries(columnKeys.map((key) => [key, toCell(obj[key], [i, key])])),
    }))

    return { kind: 'object-array', columns: columnKeys.map((key) => ({ key })), rows }
  }

  if (Array.isArray(value)) {
    return {
      kind: 'index-value',
      rows: value.map((v, i) => ({ key: String(i), path: buildJsonPath([i]), cell: toCell(v, [i]) })),
    }
  }

  if (isPlainObject(value)) {
    return {
      kind: 'key-value',
      rows: Object.entries(value).map(([key, v]) => ({ key, path: buildJsonPath([key]), cell: toCell(v, [key]) })),
    }
  }

  return { kind: 'key-value', rows: [{ key: '$', path: '$', cell: toCell(value, []) }] }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/jsonTableRows.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/jsonTableRows.ts src/lib/jsonTableRows.test.ts
git commit -m "Add JSON table rows logic for Table view"
```

---

### Task 4: Chart data logic (Chart view data)

**Files:**
- Create: `src/lib/jsonChartData.ts`
- Test: `src/lib/jsonChartData.test.ts`

**Interfaces:**
- Produces: `computeChartData(value: unknown): ChartDataResult`; types `ChartField`, `ChartDataResult`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/jsonChartData.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { computeChartData } from './jsonChartData'

describe('computeChartData', () => {
  it('rejects a non-array value', () => {
    const result = computeChartData({ a: 1 })
    expect(result.ok).toBe(false)
  })

  it('rejects an empty array', () => {
    expect(computeChartData([]).ok).toBe(false)
  })

  it('rejects an array of non-objects', () => {
    expect(computeChartData([1, 2, 3]).ok).toBe(false)
  })

  it('rejects an array of objects with no numeric field', () => {
    const result = computeChartData([{ name: 'a' }, { name: 'b' }])
    expect(result.ok).toBe(false)
  })

  it('accepts an array of objects with a numeric field, classifying string/number fields', () => {
    const result = computeChartData([{ name: 'a', score: 1 }, { name: 'b', score: 2 }])
    expect(result).toEqual({
      ok: true,
      fields: [
        { key: 'name', type: 'string' },
        { key: 'score', type: 'number' },
      ],
      numericFields: ['score'],
      labelFields: ['name'],
      data: [{ name: 'a', score: 1 }, { name: 'b', score: 2 }],
    })
  })

  it('skips fields whose first seen value is neither string nor number', () => {
    const result = computeChartData([{ active: true, score: 1 }])
    if (!result.ok) throw new Error('unreachable')
    expect(result.fields.map((f) => f.key)).toEqual(['score'])
  })
})
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/lib/jsonChartData.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/lib/jsonChartData.ts`**

```ts
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export interface ChartField {
  key: string
  type: 'string' | 'number'
}

export type ChartDataResult =
  | { ok: true; fields: ChartField[]; numericFields: string[]; labelFields: string[]; data: Record<string, unknown>[] }
  | { ok: false; reason: string }

export function computeChartData(value: unknown): ChartDataResult {
  if (!Array.isArray(value) || value.length === 0 || !value.every(isPlainObject)) {
    return { ok: false, reason: 'Chart view needs an array of objects.' }
  }

  const objects = value as Record<string, unknown>[]
  const fieldTypes = new Map<string, 'string' | 'number'>()

  for (const obj of objects) {
    for (const [key, val] of Object.entries(obj)) {
      if (fieldTypes.has(key)) continue
      if (typeof val === 'number') fieldTypes.set(key, 'number')
      else if (typeof val === 'string') fieldTypes.set(key, 'string')
    }
  }

  const numericFields = [...fieldTypes.entries()].filter(([, t]) => t === 'number').map(([k]) => k)
  if (numericFields.length === 0) {
    return { ok: false, reason: 'Chart view needs at least one numeric field.' }
  }

  const labelFields = [...fieldTypes.entries()].filter(([, t]) => t === 'string').map(([k]) => k)
  const fields: ChartField[] = [...fieldTypes.entries()].map(([key, type]) => ({ key, type }))

  return { ok: true, fields, numericFields, labelFields, data: objects }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/jsonChartData.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/jsonChartData.ts src/lib/jsonChartData.test.ts
git commit -m "Add JSON chart data logic for Chart view"
```

---

### Task 5: GraphNode + GraphView (Tree view UI)

**Files:**
- Create: `src/tools/json-viewer/GraphNode.tsx`
- Create: `src/tools/json-viewer/GraphView.tsx`

**Interfaces:**
- Consumes: `computeJsonGraphLayout`, `type GraphNodeRow`, `MAX_NODES`, `CARD_WIDTH`, `ROW_HEIGHT`, `HEADER_HEIGHT` (`src/lib/jsonGraphLayout.ts`)
- Produces: `<GraphView value={unknown} onCopyPath={(path: string) => void} onCopyValue={(value: unknown) => void} />`

UI composition, verified manually per the plan's testing approach.

- [ ] **Step 1: Install `@xyflow/react`**

```bash
npm install @xyflow/react
```

- [ ] **Step 2: Implement `src/tools/json-viewer/GraphNode.tsx`**

```tsx
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { GraphNodeRow } from '../../lib/jsonGraphLayout'

interface GraphCardData {
  rows: GraphNodeRow[]
  onCopyPath: (path: string) => void
  onCopyValue: (value: unknown) => void
  onFocusNode: (id: string) => void
}

export function GraphCard(props: NodeProps) {
  const { rows, onCopyPath, onCopyValue, onFocusNode } = props.data as unknown as GraphCardData

  return (
    <div className="rounded border border-slate-300 bg-white shadow-sm text-xs font-mono min-w-[200px]">
      {rows.map((row) => (
        <div key={row.key} className="flex items-center gap-2 px-2 py-1 border-b border-slate-100 last:border-b-0">
          <button type="button" onClick={() => onCopyPath(row.path)} className="text-blue-700 hover:underline">
            {row.key}
          </button>
          {row.kind === 'primitive' ? (
            <button
              type="button"
              onClick={() => onCopyValue(row.value)}
              className="text-emerald-700 ml-auto truncate max-w-[100px] hover:underline"
            >
              {JSON.stringify(row.value)}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => row.childId && onFocusNode(row.childId)}
              className="text-slate-400 ml-auto hover:text-slate-700"
            >
              {row.kind === 'array' ? `[${row.count}]` : `{${row.count}}`}
            </button>
          )}
        </div>
      ))}
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  )
}
```

- [ ] **Step 3: Implement `src/tools/json-viewer/GraphView.tsx`**

```tsx
import { useCallback, useMemo } from 'react'
import { ReactFlow, ReactFlowProvider, Background, Controls, useReactFlow, type Node, type Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { computeJsonGraphLayout, CARD_WIDTH, ROW_HEIGHT, HEADER_HEIGHT, MAX_NODES } from '../../lib/jsonGraphLayout'
import { GraphCard } from './GraphNode'

const nodeTypes = { card: GraphCard }

interface GraphCanvasProps {
  value: unknown
  onCopyPath: (path: string) => void
  onCopyValue: (value: unknown) => void
}

function GraphCanvas({ value, onCopyPath, onCopyValue }: GraphCanvasProps) {
  const layout = useMemo(() => computeJsonGraphLayout(value), [value])
  const { setCenter } = useReactFlow()

  const onFocusNode = useCallback(
    (id: string) => {
      const target = layout.nodes.find((n) => n.id === id)
      if (!target) return
      const height = HEADER_HEIGHT + target.data.rows.length * ROW_HEIGHT
      setCenter(target.position.x + CARD_WIDTH / 2, target.position.y + height / 2, { zoom: 1, duration: 400 })
    },
    [layout, setCenter],
  )

  const nodes: Node[] = layout.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: { rows: n.data.rows, onCopyPath, onCopyValue, onFocusNode },
  }))

  const edges: Edge[] = layout.edges.map((e) => ({ id: e.id, source: e.source, target: e.target }))

  return (
    <div className="h-full w-full relative">
      {layout.truncated && (
        <div className="absolute top-2 left-2 z-10 bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded border border-amber-300">
          Large JSON — showing the first {MAX_NODES} nodes. Try Table view for the full data.
        </div>
      )}
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}

export function GraphView({ value, onCopyPath, onCopyValue }: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvas value={value} onCopyPath={onCopyPath} onCopyValue={onCopyValue} />
    </ReactFlowProvider>
  )
}
```

- [ ] **Step 4: Verify build succeeds**

Run: `npm run build`
Expected: no TypeScript errors (this component isn't wired into `JsonViewerPage` yet, but must compile standalone).

- [ ] **Step 5: Commit**

```bash
git add src/tools/json-viewer/GraphNode.tsx src/tools/json-viewer/GraphView.tsx package.json package-lock.json
git commit -m "Add GraphNode/GraphView: node-graph Tree view"
```

---

### Task 6: TableView (Table view UI)

**Files:**
- Create: `src/tools/json-viewer/TableView.tsx`

**Interfaces:**
- Consumes: `computeTableShape`, `type TableCellValue`, `type TableSubRow` (`src/lib/jsonTableRows.ts`)
- Produces: `<TableView value={unknown} onCopyPath={(path: string) => void} onCopyValue={(value: unknown) => void} />`

UI composition, verified manually per the plan's testing approach.

- [ ] **Step 1: Implement `src/tools/json-viewer/TableView.tsx`**

```tsx
import { computeTableShape, type TableCellValue } from '../../lib/jsonTableRows'

interface CellProps {
  cell: TableCellValue
  onCopyPath: (path: string) => void
  onCopyValue: (value: unknown) => void
}

function Cell({ cell, onCopyPath, onCopyValue }: CellProps) {
  if (cell.kind === 'primitive') {
    return (
      <button
        type="button"
        onClick={() => onCopyValue(cell.value)}
        className="font-mono text-xs text-emerald-700 hover:underline text-left"
      >
        {JSON.stringify(cell.value)}
      </button>
    )
  }

  return (
    <table className="w-full text-xs">
      <tbody>
        {cell.rows.map((row) => (
          <tr key={row.key}>
            <td className="pr-2 text-slate-500 font-mono align-top whitespace-nowrap">
              <button type="button" onClick={() => onCopyPath(row.path)} className="hover:underline">
                {row.key}
              </button>
            </td>
            <td className="font-mono align-top">
              <Cell cell={row.cell} onCopyPath={onCopyPath} onCopyValue={onCopyValue} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

interface TableViewProps {
  value: unknown
  onCopyPath: (path: string) => void
  onCopyValue: (value: unknown) => void
}

export function TableView({ value, onCopyPath, onCopyValue }: TableViewProps) {
  const shape = computeTableShape(value)

  if (shape.kind === 'object-array') {
    return (
      <div className="overflow-auto h-full">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              {shape.columns.map((col) => (
                <th key={col.key} className="text-left border-b border-slate-300 px-2 py-1 sticky top-0 bg-white">
                  {col.key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shape.rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-100 align-top">
                {shape.columns.map((col) => (
                  <td key={col.key} className="px-2 py-1">
                    <Cell cell={row.cells[col.key]} onCopyPath={onCopyPath} onCopyValue={onCopyValue} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-sm border-collapse">
        <tbody>
          {shape.rows.map((row) => (
            <tr key={row.key} className="border-b border-slate-100 align-top">
              <td className="px-2 py-1 text-slate-500 font-mono whitespace-nowrap">
                <button type="button" onClick={() => onCopyPath(row.path)} className="hover:underline">
                  {row.key}
                </button>
              </td>
              <td className="px-2 py-1">
                <Cell cell={row.cell} onCopyPath={onCopyPath} onCopyValue={onCopyValue} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Verify build succeeds**

Run: `npm run build`
Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/tools/json-viewer/TableView.tsx
git commit -m "Add TableView with recursive inline nested-cell rendering"
```

---

### Task 7: TextView (Text view UI)

**Files:**
- Create: `src/tools/json-viewer/TextView.tsx`

**Interfaces:**
- Produces: `<TextView value={unknown} />`

UI composition, verified manually per the plan's testing approach.

- [ ] **Step 1: Implement `src/tools/json-viewer/TextView.tsx`**

```tsx
import Editor from '@monaco-editor/react'

export function TextView({ value }: { value: unknown }) {
  const text = JSON.stringify(value, null, 2)

  return (
    <Editor
      language="json"
      value={text}
      options={{ minimap: { enabled: false }, fontSize: 13, readOnly: true }}
    />
  )
}
```

- [ ] **Step 2: Verify build succeeds**

Run: `npm run build`
Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/tools/json-viewer/TextView.tsx
git commit -m "Add TextView: read-only pretty-printed JSON"
```

---

### Task 8: ChartView (Chart view UI)

**Files:**
- Create: `src/tools/json-viewer/ChartView.tsx`

**Interfaces:**
- Consumes: `computeChartData` (`src/lib/jsonChartData.ts`)
- Produces: `<ChartView value={unknown} />`

UI composition, verified manually per the plan's testing approach.

- [ ] **Step 1: Install `recharts`**

```bash
npm install recharts
```

- [ ] **Step 2: Implement `src/tools/json-viewer/ChartView.tsx`**

```tsx
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { computeChartData } from '../../lib/jsonChartData'

type ChartKind = 'bar' | 'line'

export function ChartView({ value }: { value: unknown }) {
  const result = useMemo(() => computeChartData(value), [value])
  const [chartKind, setChartKind] = useState<ChartKind>('bar')
  const [xField, setXField] = useState<string | null>(null)
  const [yField, setYField] = useState<string | null>(null)

  if (!result.ok) {
    return <div className="p-4 text-sm text-slate-500">{result.reason}</div>
  }

  const x = xField ?? result.labelFields[0] ?? result.fields[0]?.key
  const y = yField ?? result.numericFields[0]

  return (
    <div className="h-full flex flex-col p-3 gap-2">
      <div className="flex items-center gap-3 text-sm">
        <label className="flex items-center gap-1">
          X:
          <select value={x} onChange={(e) => setXField(e.target.value)} className="border border-slate-300 rounded px-1 py-0.5">
            {result.fields.map((f) => (
              <option key={f.key} value={f.key}>{f.key}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          Y:
          <select value={y} onChange={(e) => setYField(e.target.value)} className="border border-slate-300 rounded px-1 py-0.5">
            {result.numericFields.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          Type:
          <select
            value={chartKind}
            onChange={(e) => setChartKind(e.target.value as ChartKind)}
            className="border border-slate-300 rounded px-1 py-0.5"
          >
            <option value="bar">Bar</option>
            <option value="line">Line</option>
          </select>
        </label>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          {chartKind === 'bar' ? (
            <BarChart data={result.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={x} />
              <YAxis />
              <Tooltip />
              <Bar dataKey={y} fill="#4f46e5" />
            </BarChart>
          ) : (
            <LineChart data={result.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={x} />
              <YAxis />
              <Tooltip />
              <Line dataKey={y} stroke="#4f46e5" />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify build succeeds**

Run: `npm run build`
Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/tools/json-viewer/ChartView.tsx package.json package-lock.json
git commit -m "Add ChartView: Bar/Line chart for arrays of objects"
```

---

### Task 9: Toast notifications

**Files:**
- Create: `src/tools/json-viewer/useToast.ts`
- Test: `src/tools/json-viewer/useToast.test.ts`
- Create: `src/tools/json-viewer/Toast.tsx`

**Interfaces:**
- Produces: `useToast(): { toasts: ToastMessage[]; showToast: (text: string) => void }`; `<Toast toasts={ToastMessage[]} />`

- [ ] **Step 1: Write the failing tests**

Create `src/tools/json-viewer/useToast.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useToast } from './useToast'

describe('useToast', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('adds a toast when showToast is called', () => {
    const { result } = renderHook(() => useToast())
    act(() => result.current.showToast('Copied!'))
    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0].text).toBe('Copied!')
  })

  it('removes the toast after the timeout', () => {
    const { result } = renderHook(() => useToast())
    act(() => result.current.showToast('Copied!'))
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current.toasts).toHaveLength(0)
  })

  it('supports multiple simultaneous toasts with distinct ids', () => {
    const { result } = renderHook(() => useToast())
    act(() => {
      result.current.showToast('First')
      result.current.showToast('Second')
    })
    expect(result.current.toasts).toHaveLength(2)
    expect(result.current.toasts[0].id).not.toBe(result.current.toasts[1].id)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/tools/json-viewer/useToast.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/tools/json-viewer/useToast.ts`**

```ts
import { useCallback, useRef, useState } from 'react'

export interface ToastMessage {
  id: number
  text: string
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const nextId = useRef(0)

  const showToast = useCallback((text: string) => {
    const id = nextId.current++
    setToasts((current) => [...current, { id, text }])
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id))
    }, 2000)
  }, [])

  return { toasts, showToast }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/tools/json-viewer/useToast.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Implement `src/tools/json-viewer/Toast.tsx`**

```tsx
import type { ToastMessage } from './useToast'

export function Toast({ toasts }: { toasts: ToastMessage[] }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-50">
      {toasts.map((t) => (
        <div key={t.id} className="bg-slate-800 text-white text-sm px-3 py-1.5 rounded shadow-lg">
          {t.text}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Verify build succeeds**

Run: `npm run build`
Expected: no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add src/tools/json-viewer/useToast.ts src/tools/json-viewer/useToast.test.ts src/tools/json-viewer/Toast.tsx
git commit -m "Add toast notifications for copy-action feedback"
```

---

### Task 10: IconToolbar

**Files:**
- Create: `src/tools/json-viewer/IconToolbar.tsx`

**Interfaces:**
- Produces: `<IconToolbar onFormat onMinify onAutoFix onEscape onUnescape onConvertYaml onConvertTypeScript onToggleJsonPath jsonPathActive convertDisabled />` (all handlers `() => void` except `jsonPathActive`/`convertDisabled`: `boolean`)

UI composition, verified manually per the plan's testing approach.

- [ ] **Step 1: Install `lucide-react`**

```bash
npm install lucide-react
```

- [ ] **Step 2: Implement `src/tools/json-viewer/IconToolbar.tsx`**

```tsx
import { useState, type ReactNode } from 'react'
import { AlignLeft, Minimize2, Wrench, Quote, Eraser, FileCode2, ChevronDown, Route } from 'lucide-react'

function ToolbarButton({
  icon,
  label,
  onClick,
  active,
  disabled,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {icon}
    </button>
  )
}

interface IconToolbarProps {
  onFormat: () => void
  onMinify: () => void
  onAutoFix: () => void
  onEscape: () => void
  onUnescape: () => void
  onConvertYaml: () => void
  onConvertTypeScript: () => void
  onToggleJsonPath: () => void
  jsonPathActive: boolean
  convertDisabled: boolean
}

export function IconToolbar({
  onFormat,
  onMinify,
  onAutoFix,
  onEscape,
  onUnescape,
  onConvertYaml,
  onConvertTypeScript,
  onToggleJsonPath,
  jsonPathActive,
  convertDisabled,
}: IconToolbarProps) {
  const [convertOpen, setConvertOpen] = useState(false)

  return (
    <div className="flex items-center gap-1 border-b border-slate-200 px-4 py-2">
      <ToolbarButton icon={<AlignLeft size={16} />} label="Format" onClick={onFormat} />
      <ToolbarButton icon={<Minimize2 size={16} />} label="Minify" onClick={onMinify} />
      <ToolbarButton icon={<Wrench size={16} />} label="Auto-fix" onClick={onAutoFix} />
      <div className="w-px h-5 bg-slate-200 mx-1" />
      <ToolbarButton icon={<Quote size={16} />} label="Escape" onClick={onEscape} />
      <ToolbarButton icon={<Eraser size={16} />} label="Unescape" onClick={onUnescape} />
      <div className="w-px h-5 bg-slate-200 mx-1" />
      <div className="relative">
        <ToolbarButton
          icon={
            <span className="flex items-center gap-0.5">
              <FileCode2 size={16} />
              <ChevronDown size={12} />
            </span>
          }
          label="Convert"
          onClick={() => setConvertOpen((v) => !v)}
          disabled={convertDisabled}
        />
        {convertOpen && !convertDisabled && (
          <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded shadow-lg z-20 min-w-[8rem]">
            <button
              type="button"
              onClick={() => {
                onConvertYaml()
                setConvertOpen(false)
              }}
              className="block w-full text-left px-3 py-1.5 text-sm hover:bg-slate-100"
            >
              To YAML
            </button>
            <button
              type="button"
              onClick={() => {
                onConvertTypeScript()
                setConvertOpen(false)
              }}
              className="block w-full text-left px-3 py-1.5 text-sm hover:bg-slate-100"
            >
              To TypeScript
            </button>
          </div>
        )}
      </div>
      <div className="w-px h-5 bg-slate-200 mx-1" />
      <ToolbarButton icon={<Route size={16} />} label="JSONPath" onClick={onToggleJsonPath} active={jsonPathActive} />
    </div>
  )
}
```

- [ ] **Step 3: Verify build succeeds**

Run: `npm run build`
Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/tools/json-viewer/IconToolbar.tsx package.json package-lock.json
git commit -m "Add IconToolbar: replaces the 8-button text toolbar"
```

---

### Task 11: Wire everything into JsonViewerPage

**Files:**
- Modify: `src/tools/json-viewer/ConvertModal.tsx` (add `onCopied` callback)
- Modify: `src/tools/json-viewer/JsonViewerPage.tsx` (full replacement of the component body)

**Interfaces:**
- Consumes: `GraphView` (Task 5), `TableView` (Task 6), `TextView` (Task 7), `ChartView` (Task 8), `useToast`/`Toast` (Task 9), `IconToolbar` (Task 10), `countJsonMatches` (Task 1), everything already consumed pre-redesign (`parseJsonStrict`, `autoFixJson`, `escapeJsonString`, `unescapeJsonString`, `loadJsonViewerContent`/`saveJsonViewerContent`, `CompareView`, `JsonPathPanel`).

- [ ] **Step 1: Modify `src/tools/json-viewer/ConvertModal.tsx` to add copy feedback**

Replace the full file:

```tsx
import { toYaml, toTypeScriptInterface } from '../../lib/jsonConvert'

interface ConvertModalProps {
  value: unknown
  format: 'yaml' | 'typescript'
  onClose: () => void
  onCopied: () => void
}

export function ConvertModal({ value, format, onClose, onCopied }: ConvertModalProps) {
  let output: string
  let error: string | null = null

  try {
    output = format === 'yaml' ? toYaml(value) : toTypeScriptInterface(value)
  } catch (err) {
    output = ''
    error = (err as Error).message
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(output)
    onCopied()
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-10">
      <div className="bg-white rounded-lg p-4 w-[32rem] flex flex-col gap-2">
        <h2 className="font-semibold text-sm">{format === 'yaml' ? 'YAML' : 'TypeScript interface'}</h2>
        {error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : (
          <pre className="text-xs bg-slate-50 border border-slate-200 rounded p-2 overflow-auto max-h-96 whitespace-pre-wrap">{output}</pre>
        )}
        <div className="flex justify-end gap-2 mt-2">
          <button onClick={onClose} className="px-3 py-1 text-sm rounded bg-slate-200">Close</button>
          {!error && (
            <button onClick={handleCopy} className="px-3 py-1 text-sm rounded bg-slate-800 text-white">Copy</button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Replace `src/tools/json-viewer/JsonViewerPage.tsx`**

```tsx
import { useMemo, useState } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import { Network, Table2, Type, BarChart3 } from 'lucide-react'
import { parseJsonStrict, autoFixJson } from '../../lib/jsonAutoFix'
import { escapeJsonString, unescapeJsonString } from '../../lib/jsonEscape'
import { countJsonMatches } from '../../lib/jsonSearch'
import { loadJsonViewerContent, saveJsonViewerContent } from './jsonViewerStore'
import { CompareView } from './CompareView'
import { ConvertModal } from './ConvertModal'
import { JsonPathPanel } from './JsonPathPanel'
import { GraphView } from './GraphView'
import { TableView } from './TableView'
import { TextView } from './TextView'
import { ChartView } from './ChartView'
import { IconToolbar } from './IconToolbar'
import { Toast } from './Toast'
import { useToast } from './useToast'

type SubTab = 'editor' | 'compare'
type ViewMode = 'tree' | 'table' | 'text' | 'chart'

const VIEW_MODES: { mode: ViewMode; label: string; icon: typeof Network }[] = [
  { mode: 'tree', label: 'Tree', icon: Network },
  { mode: 'table', label: 'Table', icon: Table2 },
  { mode: 'text', label: 'Text', icon: Type },
  { mode: 'chart', label: 'Chart', icon: BarChart3 },
]

export function JsonViewerPage() {
  const [subTab, setSubTab] = useState<SubTab>('editor')
  const [viewMode, setViewMode] = useState<ViewMode>('tree')
  const [text, setText] = useState(() => loadJsonViewerContent())
  const [search, setSearch] = useState('')
  const [editorRef, setEditorRef] = useState<Parameters<OnMount>[0] | null>(null)
  const [monacoRef, setMonacoRef] = useState<Parameters<OnMount>[1] | null>(null)
  const [convertFormat, setConvertFormat] = useState<'yaml' | 'typescript' | null>(null)
  const [showJsonPath, setShowJsonPath] = useState(false)
  const [escapeError, setEscapeError] = useState<string | null>(null)
  const { toasts, showToast } = useToast()

  const parsed = useMemo(() => parseJsonStrict(text), [text])
  const matchCount = useMemo(() => (parsed.ok ? countJsonMatches(parsed.value, search) : 0), [parsed, search])

  const handleChange = (value: string | undefined) => {
    const next = value ?? ''
    setText(next)
    saveJsonViewerContent(next)
    setEscapeError(null)
  }

  const handleMount: OnMount = (editor, monacoInstance) => {
    setEditorRef(editor)
    setMonacoRef(monacoInstance)
  }

  const applyMarkers = (result: ReturnType<typeof parseJsonStrict>) => {
    if (!editorRef || !monacoRef) return
    const model = editorRef.getModel()
    if (!model) return

    if (result.ok) {
      monacoRef.editor.setModelMarkers(model, 'json-viewer', [])
      return
    }

    monacoRef.editor.setModelMarkers(
      model,
      'json-viewer',
      result.errors.map((e) => ({
        severity: monacoRef.MarkerSeverity.Error,
        message: e.message,
        startLineNumber: e.line,
        startColumn: e.column,
        endLineNumber: e.line,
        endColumn: e.column + 1,
      })),
    )
  }

  useMemo(() => applyMarkers(parsed), [parsed, editorRef, monacoRef])

  const handleFormat = () => {
    if (!parsed.ok) return
    handleChange(JSON.stringify(parsed.value, null, 2))
  }

  const handleMinify = () => {
    if (!parsed.ok) return
    handleChange(JSON.stringify(parsed.value))
  }

  const handleAutoFix = () => {
    const result = autoFixJson(text)
    if (result.fixed) handleChange(result.fixed)
  }

  const handleEscape = () => {
    handleChange(escapeJsonString(text))
    setEscapeError(null)
  }

  const handleUnescape = () => {
    const result = unescapeJsonString(text)
    if (result.ok) {
      handleChange(result.result)
      setEscapeError(null)
    } else {
      setEscapeError(result.error)
    }
  }

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path)
    showToast(`Copied path: ${path}`)
  }

  const handleCopyValue = (value: unknown) => {
    navigator.clipboard.writeText(typeof value === 'string' ? value : JSON.stringify(value))
    showToast('Copied value')
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 pt-2">
        <button
          onClick={() => setSubTab('editor')}
          className={`px-3 py-1 text-sm rounded-t ${subTab === 'editor' ? 'bg-slate-800 text-white' : 'text-slate-600'}`}
        >
          Editor
        </button>
        <button
          onClick={() => setSubTab('compare')}
          className={`px-3 py-1 text-sm rounded-t ${subTab === 'compare' ? 'bg-slate-800 text-white' : 'text-slate-600'}`}
        >
          Compare
        </button>
      </div>

      {subTab === 'compare' ? (
        <CompareView />
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <IconToolbar
            onFormat={handleFormat}
            onMinify={handleMinify}
            onAutoFix={handleAutoFix}
            onEscape={handleEscape}
            onUnescape={handleUnescape}
            onConvertYaml={() => setConvertFormat('yaml')}
            onConvertTypeScript={() => setConvertFormat('typescript')}
            onToggleJsonPath={() => setShowJsonPath((v) => !v)}
            jsonPathActive={showJsonPath}
            convertDisabled={!parsed.ok}
          />

          {escapeError && <div className="px-4 py-1 text-sm text-red-600">{escapeError}</div>}

          {showJsonPath && <JsonPathPanel value={parsed.ok ? parsed.value : null} />}

          <div className="flex-1 grid grid-cols-2 min-h-0">
            <Editor
              language="json"
              value={text}
              onMount={handleMount}
              onChange={handleChange}
              options={{ minimap: { enabled: false }, fontSize: 13 }}
            />
            <div className="flex flex-col min-h-0 border-l border-slate-200">
              <div className="flex items-center gap-1 border-b border-slate-200 px-3 py-1.5">
                {VIEW_MODES.map(({ mode, label, icon: Icon }) => (
                  <button
                    key={mode}
                    type="button"
                    title={label}
                    aria-label={label}
                    onClick={() => setViewMode(mode)}
                    className={`p-1.5 rounded ${
                      viewMode === mode ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon size={16} />
                  </button>
                ))}
                <input
                  placeholder="Search JSON…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ml-auto px-2 py-1 text-sm border border-slate-300 rounded w-48"
                />
                {search && <span className="text-xs text-slate-500 whitespace-nowrap">{matchCount} matches</span>}
              </div>
              <div className="flex-1 min-h-0 overflow-auto">
                {!parsed.ok ? (
                  <div className="p-3 text-sm text-red-600">
                    {parsed.errors.map((e, i) => (
                      <div key={i}>Line {e.line}, col {e.column}: {e.message}</div>
                    ))}
                  </div>
                ) : viewMode === 'tree' ? (
                  <GraphView value={parsed.value} onCopyPath={handleCopyPath} onCopyValue={handleCopyValue} />
                ) : viewMode === 'table' ? (
                  <TableView value={parsed.value} onCopyPath={handleCopyPath} onCopyValue={handleCopyValue} />
                ) : viewMode === 'text' ? (
                  <TextView value={parsed.value} />
                ) : (
                  <ChartView value={parsed.value} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {convertFormat && parsed.ok && (
        <ConvertModal
          value={parsed.value}
          format={convertFormat}
          onClose={() => setConvertFormat(null)}
          onCopied={() => showToast('Copied converted output')}
        />
      )}

      <Toast toasts={toasts} />
    </div>
  )
}
```

- [ ] **Step 3: Run the full test suite and build**

Run: `npm run test && npm run build`
Expected: all tests PASS (Phase 1 + Phase 2 + this plan's tests), build succeeds with no TypeScript errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, open `/#/json`.
- **Icon toolbar**: hover each icon, confirm tooltips show Format/Minify/Auto-fix/Escape/Unescape/Convert/JSONPath; click Convert, confirm a dropdown with "To YAML"/"To TypeScript" opens and closes on selection.
- **Tree view**: confirm it now renders as a connected node-graph (not the old collapsed text tree); pan/zoom with the mouse; click a nested badge (e.g. `{2}`) and confirm the view centers on the child card; click a key and confirm a "Copied path" toast appears; click a primitive value and confirm a "Copied value" toast appears.
- **Table view**: switch to it with an array-of-objects JSON (e.g. paste `[{"id":1,"address":{"city":"HCM"}}]`), confirm columns match keys and the `address` cell renders an inline sub-table (not a collapsed badge); click a primitive cell, confirm a copy toast.
- **Text view**: switch to it, confirm read-only pretty-printed JSON with syntax highlighting; confirm typing in it has no effect (or is disabled).
- **Chart view**: with an array of objects containing a numeric field, confirm a Bar chart renders; switch X/Y dropdowns and chart type, confirm the chart updates; with non-chartable JSON (e.g. a single object), confirm a message like "Chart view needs an array of objects." shows instead of a broken chart.
- **Search**: type a query that matches some keys/values, confirm the match count updates next to the search box.
- **Convert modal copy**: open Convert to YAML, click Copy, confirm a "Copied converted output" toast appears.
- **Regression**: confirm Format/Minify/Auto-fix/Escape/Unescape/JSONPath panel and the Compare tab still work as before.

Stop the dev server after confirming.

- [ ] **Step 5: Commit**

```bash
git add src/tools/json-viewer/ConvertModal.tsx src/tools/json-viewer/JsonViewerPage.tsx
git commit -m "Wire Tree/Table/Text/Chart views, icon toolbar, search count, and toast into JsonViewerPage"
```

---

## Self-Review Notes

- **Spec coverage:** Tree-as-graph (Tasks 2, 5), Table with inline nested sub-tables (Tasks 3, 6), Text view (Task 7), Chart view (Tasks 4, 8), icon toolbar (Task 10), shared search with match count (Tasks 1, 11), copy-action toast feedback (Tasks 9, 11) — every section of the design spec has a corresponding task.
- **Placeholder scan:** none found — every step has complete code or an exact command with expected output.
- **Correctness check against existing code:** initial draft assumed `buildJsonPath` (`src/lib/jsonPath.ts`) prepends `$` to every path; its actual behavior (confirmed against `jsonPath.test.ts`) only returns `$` for the empty/root segment list — non-root paths are dollar-less (`a.b`, `a.b[0]`). All hardcoded path expectations in Task 2 and Task 3 tests were corrected to match (e.g. `'address.city'` not `'$.address.city'`; graph card ids like `'address'`/`'tags'` not `'$.address'`/`'$.tags'`).
- **Type consistency:** `GraphNodeRow`/`GraphCardData`/`GraphNode`/`GraphEdge` defined once in `jsonGraphLayout.ts` (Task 2), consumed identically by `GraphNode.tsx`/`GraphView.tsx` (Task 5). `TableCellValue`/`TableSubRow`/`TableColumn`/`TableRow`/`TableShape` defined once in `jsonTableRows.ts` (Task 3), consumed identically by `TableView.tsx` (Task 6). `ChartDataResult`/`ChartField` defined once in `jsonChartData.ts` (Task 4), consumed identically by `ChartView.tsx` (Task 8). `ToastMessage` defined once in `useToast.ts` (Task 9), consumed identically by `Toast.tsx`. `onCopyPath`/`onCopyValue` signatures (`(path: string) => void` / `(value: unknown) => void`) are identical across `GraphView`, `TableView`, and `JsonViewerPage` (Task 11). `IconToolbarProps` (Task 10) match the handlers passed in `JsonViewerPage` (Task 11) exactly. `ConvertModal`'s new `onCopied: () => void` prop (Task 11 Step 1) matches its usage in `JsonViewerPage` (Task 11 Step 2).
