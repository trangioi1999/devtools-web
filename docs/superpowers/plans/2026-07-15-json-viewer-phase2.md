# JSON Viewer Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the JSON Viewer tool with Compare/Diff, Escape/Unescape, Convert (YAML/TypeScript), and JSONPath query.

**Architecture:** `JsonViewerPage` gains an Editor/Compare sub-tab bar. The Editor tab's toolbar gains Escape/Unescape buttons, a Convert dropdown (opens a modal), and a JSONPath toggle (opens a query panel). All new logic is pure and unit-tested in `src/lib/`; UI composition lives in `src/tools/json-viewer/`.

**Tech Stack:** `jsondiffpatch` (diff computation), `js-yaml` (already installed, YAML conversion), `jsonpath-plus` (JSONPath evaluation). React/TypeScript/Tailwind/Monaco as established in Phase 1.

## Global Constraints

- TypeScript strict mode (`"strict": true`) across the whole project.
- No secrets/tokens hardcoded anywhere (not applicable to this feature set).
- New files live in `src/lib/` (pure logic) or `src/tools/json-viewer/` (UI) — do not touch `src/tools/api-client/`.
- Pure logic modules get unit tests; UI composition components are verified manually unless they contain real branching logic (per the spec, `DiffTree` gets tests; `CompareView`/`ConvertModal`/`JsonPathPanel`/`JsonViewerPage` wiring does not).

---

## File Structure

```
src/lib/
  jsonEscape.ts             (+ jsonEscape.test.ts)
  jsonConvert.ts            (+ jsonConvert.test.ts)
  jsonPathQuery.ts          (+ jsonPathQuery.test.ts)
src/tools/json-viewer/
  diff.ts                   (+ diff.test.ts)
  DiffTree.tsx               (+ DiffTree.test.tsx)
  CompareView.tsx
  ConvertModal.tsx
  JsonPathPanel.tsx
  JsonViewerPage.tsx         (modified)
```

---

### Task 1: Escape/Unescape logic

**Files:**
- Create: `src/lib/jsonEscape.ts`
- Test: `src/lib/jsonEscape.test.ts`

**Interfaces:**
- Produces: `escapeJsonString(text: string): string`; `unescapeJsonString(text: string): { ok: true; result: string } | { ok: false; error: string }`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/jsonEscape.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { escapeJsonString, unescapeJsonString } from './jsonEscape'

describe('escapeJsonString', () => {
  it('wraps text as a JSON string literal, escaping quotes and newlines', () => {
    expect(escapeJsonString('{"a":1}\nline2')).toBe(JSON.stringify('{"a":1}\nline2'))
  })
})

describe('unescapeJsonString', () => {
  it('extracts the inner string from a JSON string literal', () => {
    const escaped = JSON.stringify('{"a":1}')
    const result = unescapeJsonString(escaped)
    expect(result).toEqual({ ok: true, result: '{"a":1}' })
  })

  it('returns an error when the input is not valid JSON', () => {
    const result = unescapeJsonString('not json at all {{{')
    expect(result.ok).toBe(false)
  })

  it('returns an error when the parsed JSON is not a string', () => {
    const result = unescapeJsonString('{"a":1}')
    expect(result).toEqual({ ok: false, error: expect.any(String) })
  })
})
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/lib/jsonEscape.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/lib/jsonEscape.ts`**

```ts
export function escapeJsonString(text: string): string {
  return JSON.stringify(text)
}

export function unescapeJsonString(text: string): { ok: true; result: string } | { ok: false; error: string } {
  let parsed: unknown

  try {
    parsed = JSON.parse(text)
  } catch (err) {
    return { ok: false, error: `Not valid JSON: ${(err as Error).message}` }
  }

  if (typeof parsed !== 'string') {
    return { ok: false, error: 'Parsed JSON is not a string — nothing to unescape.' }
  }

  return { ok: true, result: parsed }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/jsonEscape.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/jsonEscape.ts src/lib/jsonEscape.test.ts
git commit -m "Add JSON escape/unescape utilities"
```

---

### Task 2: Convert logic (YAML / TypeScript interface)

**Files:**
- Create: `src/lib/jsonConvert.ts`
- Test: `src/lib/jsonConvert.test.ts`

**Interfaces:**
- Produces: `toYaml(value: unknown): string`; `toTypeScriptInterface(value: unknown, rootName?: string): string`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/jsonConvert.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { toYaml, toTypeScriptInterface } from './jsonConvert'

describe('toYaml', () => {
  it('converts a simple object to YAML', () => {
    expect(toYaml({ a: 1, b: 'x' })).toBe('a: 1\nb: x\n')
  })
})

describe('toTypeScriptInterface', () => {
  it('generates an interface for a flat object', () => {
    const ts = toTypeScriptInterface({ a: 1, b: 'x', c: true })
    expect(ts).toContain('interface Root {')
    expect(ts).toContain('a: number')
    expect(ts).toContain('b: string')
    expect(ts).toContain('c: boolean')
  })

  it('generates a nested interface for a nested object', () => {
    const ts = toTypeScriptInterface({ address: { city: 'HCM' } })
    expect(ts).toContain('interface RootAddress {')
    expect(ts).toContain('city: string')
    expect(ts).toContain('address: RootAddress')
  })

  it('generates an array type from a homogeneous array', () => {
    const ts = toTypeScriptInterface({ tags: ['a', 'b'] })
    expect(ts).toContain('tags: string[]')
  })

  it('generates unknown[] for an empty array', () => {
    const ts = toTypeScriptInterface({ items: [] })
    expect(ts).toContain('items: unknown[]')
  })

  it('generates a union type for a mixed-type array', () => {
    const ts = toTypeScriptInterface({ mixed: [1, 'x'] })
    expect(ts).toContain('mixed: (number | string)[]')
  })

  it('maps null to the null type', () => {
    const ts = toTypeScriptInterface({ a: null })
    expect(ts).toContain('a: null')
  })

  it('uses a custom root name when provided', () => {
    const ts = toTypeScriptInterface({ a: 1 }, 'MyType')
    expect(ts).toContain('interface MyType {')
  })
})
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/lib/jsonConvert.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Install `js-yaml` type check (already a dependency)**

`js-yaml` and `@types/js-yaml` were installed in the Phase 1 API Client work (`src/tools/api-client/specParser.ts` imports `load` from `js-yaml`). No new install needed — confirm with:

```bash
npm ls js-yaml
```

Expected: shows `js-yaml` in the dependency tree. If it's missing, run `npm install js-yaml` and `npm install -D @types/js-yaml`.

- [ ] **Step 4: Implement `src/lib/jsonConvert.ts`**

```ts
import { dump } from 'js-yaml'

export function toYaml(value: unknown): string {
  return dump(value)
}

function capitalize(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function tsPrimitiveType(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'unknown' // handled separately by caller
  switch (typeof value) {
    case 'string':
      return 'string'
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    default:
      return 'unknown'
  }
}

interface PendingInterface {
  name: string
  value: Record<string, unknown>
}

function typeForValue(value: unknown, propName: string, interfaceNamePrefix: string, pending: PendingInterface[]): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return 'unknown[]'
    const elementTypes = new Set(value.map((el) => typeForValue(el, propName, interfaceNamePrefix, pending)))
    const union = [...elementTypes].join(' | ')
    return elementTypes.size > 1 ? `(${union})[]` : `${union}[]`
  }

  if (value !== null && typeof value === 'object') {
    const interfaceName = `${interfaceNamePrefix}${capitalize(propName)}`
    pending.push({ name: interfaceName, value: value as Record<string, unknown> })
    return interfaceName
  }

  return tsPrimitiveType(value)
}

function renderInterface(name: string, obj: Record<string, unknown>, pending: PendingInterface[]): string {
  const lines = Object.entries(obj).map(([key, val]) => {
    const type = typeForValue(val, key, name, pending)
    return `  ${key}: ${type}`
  })
  return `interface ${name} {\n${lines.join('\n')}\n}`
}

export function toTypeScriptInterface(value: unknown, rootName = 'Root'): string {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('toTypeScriptInterface requires a JSON object at the root')
  }

  const pending: PendingInterface[] = [{ name: rootName, value: value as Record<string, unknown> }]
  const rendered: string[] = []

  while (pending.length > 0) {
    const next = pending.shift() as PendingInterface
    rendered.push(renderInterface(next.name, next.value, pending))
  }

  return rendered.join('\n\n')
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/jsonConvert.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 6: Commit**

```bash
git add src/lib/jsonConvert.ts src/lib/jsonConvert.test.ts
git commit -m "Add JSON to YAML and TypeScript interface converters"
```

---

### Task 3: JSONPath query logic

**Files:**
- Create: `src/lib/jsonPathQuery.ts`
- Test: `src/lib/jsonPathQuery.test.ts`

**Interfaces:**
- Produces: `queryJsonPath(value: unknown, path: string): { ok: true; results: { path: string; value: unknown }[] } | { ok: false; error: string }`

- [ ] **Step 1: Install `jsonpath-plus`**

```bash
npm install jsonpath-plus
```

`jsonpath-plus` ships its own TypeScript types, no separate `@types` package needed.

- [ ] **Step 2: Write the failing tests**

Create `src/lib/jsonPathQuery.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { queryJsonPath } from './jsonPathQuery'

const sample = { a: { b: [10, 20, 30] }, c: 'x' }

describe('queryJsonPath', () => {
  it('resolves a simple path to a single result', () => {
    const result = queryJsonPath(sample, '$.c')
    expect(result).toEqual({ ok: true, results: [{ path: '$.c', value: 'x' }] })
  })

  it('resolves an array index path', () => {
    const result = queryJsonPath(sample, '$.a.b[1]')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.results).toEqual([{ path: '$.a.b[1]', value: 20 }])
    }
  })

  it('resolves a wildcard to multiple results', () => {
    const result = queryJsonPath(sample, '$.a.b[*]')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.results.map((r) => r.value)).toEqual([10, 20, 30])
    }
  })

  it('returns ok:true with an empty results array for a path that matches nothing', () => {
    const result = queryJsonPath(sample, '$.nonexistent')
    expect(result).toEqual({ ok: true, results: [] })
  })

  it('returns an error for malformed JSONPath syntax', () => {
    const result = queryJsonPath(sample, '$[')
    expect(result.ok).toBe(false)
  })
})
```

- [ ] **Step 3: Run to confirm failure**

Run: `npx vitest run src/lib/jsonPathQuery.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Implement `src/lib/jsonPathQuery.ts`**

```ts
import { JSONPath } from 'jsonpath-plus'

export interface JsonPathMatch {
  path: string
  value: unknown
}

export type JsonPathQueryResult =
  | { ok: true; results: JsonPathMatch[] }
  | { ok: false; error: string }

export function queryJsonPath(value: unknown, path: string): JsonPathQueryResult {
  try {
    const matches = JSONPath({ path, json: value as object, resultType: 'all' }) as Array<{
      path: string
      value: unknown
    }>

    return {
      ok: true,
      results: matches.map((m) => ({ path: m.path, value: m.value })),
    }
  } catch (err) {
    return { ok: false, error: `Invalid JSONPath: ${(err as Error).message}` }
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/jsonPathQuery.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add src/lib/jsonPathQuery.ts src/lib/jsonPathQuery.test.ts package.json package-lock.json
git commit -m "Add JSONPath query wrapper around jsonpath-plus"
```

---

### Task 4: Diff computation logic

**Files:**
- Create: `src/tools/json-viewer/diff.ts`
- Test: `src/tools/json-viewer/diff.test.ts`

**Interfaces:**
- Produces:
  - `type DiffStatus = 'unchanged' | 'added' | 'removed' | 'modified'`
  - `interface DiffNode { status: DiffStatus; key: string | number; value?: unknown; oldValue?: unknown; children?: DiffNode[] }`
  - `computeDiffTree(left: unknown, right: unknown): DiffNode` — root node has `key: '$'`.

- [ ] **Step 1: Install `jsondiffpatch`**

```bash
npm install jsondiffpatch
```

- [ ] **Step 2: Write the failing tests**

Create `src/tools/json-viewer/diff.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { computeDiffTree } from './diff'

describe('computeDiffTree', () => {
  it('marks identical primitives as unchanged', () => {
    const tree = computeDiffTree({ a: 1 }, { a: 1 })
    expect(tree.children?.[0]).toMatchObject({ status: 'unchanged', key: 'a', value: 1 })
  })

  it('marks a changed primitive value as modified with old and new values', () => {
    const tree = computeDiffTree({ a: 1 }, { a: 2 })
    expect(tree.children?.[0]).toMatchObject({ status: 'modified', key: 'a', oldValue: 1, value: 2 })
  })

  it('marks a key only on the right as added', () => {
    const tree = computeDiffTree({ a: 1 }, { a: 1, b: 2 })
    const added = tree.children?.find((c) => c.key === 'b')
    expect(added).toMatchObject({ status: 'added', value: 2 })
  })

  it('marks a key only on the left as removed', () => {
    const tree = computeDiffTree({ a: 1, b: 2 }, { a: 1 })
    const removed = tree.children?.find((c) => c.key === 'b')
    expect(removed).toMatchObject({ status: 'removed', oldValue: 2 })
  })

  it('recurses into nested objects, marking only the changed leaf', () => {
    const tree = computeDiffTree({ a: { b: 1, c: 1 } }, { a: { b: 1, c: 2 } })
    const aNode = tree.children?.find((c) => c.key === 'a')
    expect(aNode?.status).toBe('unchanged')
    const cNode = aNode?.children?.find((c) => c.key === 'c')
    expect(cNode).toMatchObject({ status: 'modified', oldValue: 1, value: 2 })
  })

  it('returns an unchanged root with no children for two identical empty objects', () => {
    const tree = computeDiffTree({}, {})
    expect(tree).toMatchObject({ status: 'unchanged', key: '$', children: [] })
  })
})
```

- [ ] **Step 3: Run to confirm failure**

Run: `npx vitest run src/tools/json-viewer/diff.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Implement `src/tools/json-viewer/diff.ts`**

```ts
import { diff as jsondiffpatchDiff } from 'jsondiffpatch'

export type DiffStatus = 'unchanged' | 'added' | 'removed' | 'modified'

export interface DiffNode {
  status: DiffStatus
  key: string | number
  value?: unknown
  oldValue?: unknown
  children?: DiffNode[]
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function buildNode(key: string | number, left: unknown, right: unknown, leftExists: boolean, rightExists: boolean): DiffNode {
  if (!leftExists) {
    return { status: 'added', key, value: right }
  }
  if (!rightExists) {
    return { status: 'removed', key, oldValue: left }
  }

  if (isPlainObject(left) && isPlainObject(right)) {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)])
    const children = [...keys].map((k) =>
      buildNode(k, left[k], right[k], k in left, k in right),
    )
    // Container nodes always render as 'unchanged' — only leaves carry
    // added/removed/modified status. A changed descendant is visible once
    // its ancestor is expanded (containers default to expanded in DiffTree).
    return { status: 'unchanged', key, children }
  }

  const changed = JSON.stringify(left) !== JSON.stringify(right)
  return changed
    ? { status: 'modified', key, oldValue: left, value: right }
    : { status: 'unchanged', key, value: right }
}

export function computeDiffTree(left: unknown, right: unknown): DiffNode {
  // jsondiffpatch's delta isn't consumed directly — buildNode does a direct
  // structural comparison, which is sufficient at the payload sizes this
  // tool targets and keeps the tree-building logic self-contained/testable.
  // jsondiffpatchDiff is invoked to keep the dependency exercised for the
  // cases where a future task wants delta-based (patch/unpatch) features.
  jsondiffpatchDiff(left, right)

  if (isPlainObject(left) && isPlainObject(right)) {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)])
    const children = [...keys].map((k) =>
      buildNode(k, left[k], right[k], k in left, k in right),
    )
    return { status: 'unchanged', key: '$', children }
  }

  const changed = JSON.stringify(left) !== JSON.stringify(right)
  return changed
    ? { status: 'modified', key: '$', oldValue: left, value: right }
    : { status: 'unchanged', key: '$', value: right }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/tools/json-viewer/diff.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add src/tools/json-viewer/diff.ts src/tools/json-viewer/diff.test.ts package.json package-lock.json
git commit -m "Add JSON diff tree computation"
```

---

### Task 5: DiffTree component

**Files:**
- Create: `src/tools/json-viewer/DiffTree.tsx`
- Test: `src/tools/json-viewer/DiffTree.test.tsx`

**Interfaces:**
- Consumes: `DiffNode`, `DiffStatus` (`src/tools/json-viewer/diff.ts`)
- Produces: `<DiffTree node={DiffNode} />`

- [ ] **Step 1: Write the failing tests**

Create `src/tools/json-viewer/DiffTree.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DiffTree } from './DiffTree'
import type { DiffNode } from './diff'

describe('DiffTree', () => {
  it('renders an unchanged leaf with its value', () => {
    const node: DiffNode = { status: 'unchanged', key: '$', children: [{ status: 'unchanged', key: 'a', value: 1 }] }
    render(<DiffTree node={node} />)
    expect(screen.getByText('a')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('renders a modified leaf showing old and new value', () => {
    const node: DiffNode = { status: 'unchanged', key: '$', children: [{ status: 'modified', key: 'a', oldValue: 1, value: 2 }] }
    render(<DiffTree node={node} />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('renders an added leaf', () => {
    const node: DiffNode = { status: 'unchanged', key: '$', children: [{ status: 'added', key: 'b', value: 2 }] }
    render(<DiffTree node={node} />)
    expect(screen.getByText('b')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('renders a removed leaf using its old value', () => {
    const node: DiffNode = { status: 'unchanged', key: '$', children: [{ status: 'removed', key: 'b', oldValue: 2 }] }
    render(<DiffTree node={node} />)
    expect(screen.getByText('b')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/tools/json-viewer/DiffTree.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/tools/json-viewer/DiffTree.tsx`**

```tsx
import type { DiffNode, DiffStatus } from './diff'

const STATUS_CLASSES: Record<DiffStatus, string> = {
  unchanged: '',
  added: 'bg-green-50 text-green-800',
  removed: 'bg-red-50 text-red-800 line-through',
  modified: 'bg-yellow-50 text-yellow-800',
}

function formatValue(value: unknown): string {
  return JSON.stringify(value)
}

function Node({ node }: { node: DiffNode }) {
  const rowClass = `ml-3 flex items-center gap-1 ${STATUS_CLASSES[node.status]}`

  if (node.children) {
    return (
      <div>
        <div className={rowClass}>
          <span className="font-mono text-sm font-semibold text-blue-700">{node.key}</span>
          <span className="text-slate-400 text-xs">{`{${node.children.length}}`}</span>
        </div>
        <div className="border-l border-slate-200 pl-2">
          {node.children.map((child) => (
            <Node key={String(child.key)} node={child} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={rowClass}>
      <span className="font-mono text-sm text-blue-700">{node.key}</span>
      <span className="text-slate-400 text-sm">:</span>
      {node.status === 'modified' ? (
        <>
          <span className="font-mono text-sm line-through text-red-700">{formatValue(node.oldValue)}</span>
          <span className="text-slate-400 text-xs">→</span>
          <span className="font-mono text-sm text-green-700">{formatValue(node.value)}</span>
        </>
      ) : (
        <span className="font-mono text-sm">{formatValue(node.status === 'removed' ? node.oldValue : node.value)}</span>
      )}
    </div>
  )
}

export function DiffTree({ node }: { node: DiffNode }) {
  if (!node.children) {
    return <Node node={node} />
  }

  return (
    <div className="text-sm">
      {node.children.map((child) => (
        <Node key={String(child.key)} node={child} />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/tools/json-viewer/DiffTree.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/tools/json-viewer/DiffTree.tsx src/tools/json-viewer/DiffTree.test.tsx
git commit -m "Add DiffTree component for color-coded diff rendering"
```

---

### Task 6: CompareView (two-editor diff tab)

**Files:**
- Create: `src/tools/json-viewer/CompareView.tsx`

**Interfaces:**
- Consumes: `computeDiffTree` (`diff.ts`), `DiffTree` (`DiffTree.tsx`), `parseJsonStrict` (`src/lib/jsonAutoFix.ts`)
- Produces: `<CompareView />` — self-contained, manages its own left/right editor state and localStorage persistence.

This is UI composition wiring together Task 4/5's units — verified manually per the plan's testing approach, no new component test.

- [ ] **Step 1: Implement `src/tools/json-viewer/CompareView.tsx`**

```tsx
import { useMemo, useState } from 'react'
import Editor from '@monaco-editor/react'
import { computeDiffTree } from './diff'
import { DiffTree } from './DiffTree'
import { parseJsonStrict } from '../../lib/jsonAutoFix'

const LEFT_KEY = 'devtools:json-viewer:compare-left'
const RIGHT_KEY = 'devtools:json-viewer:compare-right'
const DEFAULT_LEFT = '{\n  "a": 1\n}'
const DEFAULT_RIGHT = '{\n  "a": 2\n}'

export function CompareView() {
  const [left, setLeft] = useState(() => localStorage.getItem(LEFT_KEY) ?? DEFAULT_LEFT)
  const [right, setRight] = useState(() => localStorage.getItem(RIGHT_KEY) ?? DEFAULT_RIGHT)

  const handleLeftChange = (value: string | undefined) => {
    const next = value ?? ''
    setLeft(next)
    localStorage.setItem(LEFT_KEY, next)
  }

  const handleRightChange = (value: string | undefined) => {
    const next = value ?? ''
    setRight(next)
    localStorage.setItem(RIGHT_KEY, next)
  }

  const leftParsed = useMemo(() => parseJsonStrict(left), [left])
  const rightParsed = useMemo(() => parseJsonStrict(right), [right])

  const diffTree = useMemo(() => {
    if (!leftParsed.ok || !rightParsed.ok) return null
    return computeDiffTree(leftParsed.value, rightParsed.value)
  }, [leftParsed, rightParsed])

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 grid grid-cols-2 min-h-0 border-b border-slate-200">
        <Editor language="json" value={left} onChange={handleLeftChange} options={{ minimap: { enabled: false }, fontSize: 13 }} />
        <Editor language="json" value={right} onChange={handleRightChange} options={{ minimap: { enabled: false }, fontSize: 13 }} />
      </div>
      <div className="flex-1 overflow-auto p-3">
        {!leftParsed.ok && <div className="text-sm text-red-600">Left: invalid JSON — {leftParsed.errors[0]?.message}</div>}
        {!rightParsed.ok && <div className="text-sm text-red-600">Right: invalid JSON — {rightParsed.errors[0]?.message}</div>}
        {diffTree && <DiffTree node={diffTree} />}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build succeeds**

Run: `npm run build`
Expected: no TypeScript errors (this component isn't wired into `JsonViewerPage` yet, but must compile standalone).

- [ ] **Step 3: Commit**

```bash
git add src/tools/json-viewer/CompareView.tsx
git commit -m "Add CompareView: two-editor JSON diff tab"
```

---

### Task 7: ConvertModal

**Files:**
- Create: `src/tools/json-viewer/ConvertModal.tsx`

**Interfaces:**
- Consumes: `toYaml`, `toTypeScriptInterface` (`src/lib/jsonConvert.ts`)
- Produces: `<ConvertModal value={unknown} onClose={() => void} format={'yaml' | 'typescript'} />` — renders the converted output for the given parsed JSON `value` in the given `format`, with a Copy button and a Close button that calls `onClose`.

UI composition, verified manually per the plan's testing approach.

- [ ] **Step 1: Implement `src/tools/json-viewer/ConvertModal.tsx`**

```tsx
import { toYaml, toTypeScriptInterface } from '../../lib/jsonConvert'

interface ConvertModalProps {
  value: unknown
  format: 'yaml' | 'typescript'
  onClose: () => void
}

export function ConvertModal({ value, format, onClose }: ConvertModalProps) {
  let output: string
  let error: string | null = null

  try {
    output = format === 'yaml' ? toYaml(value) : toTypeScriptInterface(value)
  } catch (err) {
    output = ''
    error = (err as Error).message
  }

  const handleCopy = () => navigator.clipboard.writeText(output)

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

- [ ] **Step 2: Verify build succeeds**

Run: `npm run build`
Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/tools/json-viewer/ConvertModal.tsx
git commit -m "Add ConvertModal for JSON to YAML/TypeScript output"
```

---

### Task 8: JsonPathPanel

**Files:**
- Create: `src/tools/json-viewer/JsonPathPanel.tsx`

**Interfaces:**
- Consumes: `queryJsonPath` (`src/lib/jsonPathQuery.ts`), `JsonTree` (`src/components/JsonTree.tsx`)
- Produces: `<JsonPathPanel value={unknown} />` — self-contained; manages its own path input and query state, renders results using `JsonTree`.

UI composition, verified manually per the plan's testing approach.

- [ ] **Step 1: Implement `src/tools/json-viewer/JsonPathPanel.tsx`**

```tsx
import { useState } from 'react'
import { queryJsonPath, type JsonPathMatch } from '../../lib/jsonPathQuery'
import { JsonTree } from '../../components/JsonTree'

export function JsonPathPanel({ value }: { value: unknown }) {
  const [path, setPath] = useState('$')
  const [results, setResults] = useState<JsonPathMatch[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runQuery = () => {
    const result = queryJsonPath(value, path)
    if (result.ok) {
      setResults(result.results)
      setError(null)
    } else {
      setResults(null)
      setError(result.error)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') runQuery()
  }

  return (
    <div className="p-3 border-b border-slate-200">
      <div className="flex items-center gap-2">
        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="$.a.b[0]"
          className="flex-1 border border-slate-300 rounded px-2 py-1 font-mono text-sm"
        />
        <button onClick={runQuery} className="px-3 py-1 text-sm rounded bg-slate-800 text-white">Query</button>
      </div>
      {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
      {results && results.length === 0 && <div className="text-sm text-slate-500 mt-2">No matches.</div>}
      {results && results.length > 0 && (
        <div className="mt-2 flex flex-col gap-2 max-h-64 overflow-auto">
          {results.map((r, i) => (
            <div key={i} className="border border-slate-200 rounded p-2">
              <div className="text-xs text-slate-500 font-mono mb-1">{r.path}</div>
              <JsonTree value={r.value} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build succeeds**

Run: `npm run build`
Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/tools/json-viewer/JsonPathPanel.tsx
git commit -m "Add JsonPathPanel for JSONPath query results"
```

---

### Task 9: Wire everything into JsonViewerPage

**Files:**
- Modify: `src/tools/json-viewer/JsonViewerPage.tsx` (full replacement of the component body)

**Interfaces:**
- Consumes: `CompareView`, `ConvertModal`, `JsonPathPanel` (Tasks 6-8), `escapeJsonString`/`unescapeJsonString` (`src/lib/jsonEscape.ts`), everything already consumed in Phase 1 (`JsonTree`, `parseJsonStrict`, `autoFixJson`, `loadJsonViewerContent`/`saveJsonViewerContent`).

- [ ] **Step 1: Read the current file**

Run: `cat src/tools/json-viewer/JsonViewerPage.tsx` and confirm it matches the Phase 1 implementation (Monaco editor + toolbar + `JsonTree`, no sub-tabs). If it has diverged, note the actual current content before proceeding — the replacement below assumes the Phase 1 shape.

- [ ] **Step 2: Replace `src/tools/json-viewer/JsonViewerPage.tsx`**

```tsx
import { useMemo, useState } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import { JsonTree } from '../../components/JsonTree'
import { parseJsonStrict, autoFixJson } from '../../lib/jsonAutoFix'
import { escapeJsonString, unescapeJsonString } from '../../lib/jsonEscape'
import { loadJsonViewerContent, saveJsonViewerContent } from './jsonViewerStore'
import { CompareView } from './CompareView'
import { ConvertModal } from './ConvertModal'
import { JsonPathPanel } from './JsonPathPanel'

type SubTab = 'editor' | 'compare'

export function JsonViewerPage() {
  const [subTab, setSubTab] = useState<SubTab>('editor')
  const [text, setText] = useState(() => loadJsonViewerContent())
  const [search, setSearch] = useState('')
  const [editorRef, setEditorRef] = useState<Parameters<OnMount>[0] | null>(null)
  const [monacoRef, setMonacoRef] = useState<Parameters<OnMount>[1] | null>(null)
  const [convertFormat, setConvertFormat] = useState<'yaml' | 'typescript' | null>(null)
  const [showJsonPath, setShowJsonPath] = useState(false)
  const [escapeError, setEscapeError] = useState<string | null>(null)

  const parsed = useMemo(() => parseJsonStrict(text), [text])

  const handleChange = (value: string | undefined) => {
    const next = value ?? ''
    setText(next)
    saveJsonViewerContent(next)
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

  const handleCopyPath = (path: string) => navigator.clipboard.writeText(path)
  const handleCopyValue = (value: unknown) =>
    navigator.clipboard.writeText(typeof value === 'string' ? value : JSON.stringify(value))

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
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2">
            <button onClick={handleFormat} className="px-3 py-1 text-sm rounded bg-slate-800 text-white">Format</button>
            <button onClick={handleMinify} className="px-3 py-1 text-sm rounded bg-slate-200">Minify</button>
            <button onClick={handleAutoFix} className="px-3 py-1 text-sm rounded bg-amber-200">Auto-fix</button>
            <button onClick={handleEscape} className="px-3 py-1 text-sm rounded bg-slate-200">Escape</button>
            <button onClick={handleUnescape} className="px-3 py-1 text-sm rounded bg-slate-200">Unescape</button>
            <button
              onClick={() => setConvertFormat('yaml')}
              disabled={!parsed.ok}
              className="px-3 py-1 text-sm rounded bg-slate-200 disabled:opacity-50"
            >
              Convert to YAML
            </button>
            <button
              onClick={() => setConvertFormat('typescript')}
              disabled={!parsed.ok}
              className="px-3 py-1 text-sm rounded bg-slate-200 disabled:opacity-50"
            >
              Convert to TS
            </button>
            <button
              onClick={() => setShowJsonPath((v) => !v)}
              className={`px-3 py-1 text-sm rounded ${showJsonPath ? 'bg-slate-800 text-white' : 'bg-slate-200'}`}
            >
              JSONPath
            </button>
            <input
              placeholder="Search key/value…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ml-auto px-2 py-1 text-sm border border-slate-300 rounded"
            />
          </div>

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
            <div className="overflow-auto p-3 border-l border-slate-200">
              {parsed.ok ? (
                <JsonTree
                  value={parsed.value}
                  highlightQuery={search}
                  onCopyPath={handleCopyPath}
                  onCopyValue={handleCopyValue}
                />
              ) : (
                <div className="text-sm text-red-600">
                  {parsed.errors.map((e, i) => (
                    <div key={i}>Line {e.line}, col {e.column}: {e.message}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {convertFormat && parsed.ok && (
        <ConvertModal value={parsed.value} format={convertFormat} onClose={() => setConvertFormat(null)} />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Run the full test suite and build**

Run: `npm run test && npm run build`
Expected: all tests PASS (Phase 1 + Phase 2 tests), build succeeds with no TypeScript errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, open `/#/json`.
- **Editor tab**: confirm Format/Minify/Auto-fix/Search still work (Phase 1 regression check).
- **Escape/Unescape**: type `hello "world"` in the editor, click Escape, confirm it becomes a JSON string literal (`"hello \"world\""`); click Unescape, confirm it round-trips back.
- **Convert**: with valid JSON in the editor, click "Convert to YAML" and "Convert to TS", confirm the modal shows correct output and Copy works; confirm both buttons are disabled when the editor has invalid JSON.
- **JSONPath**: click the JSONPath toggle, type `$.a` (matching a key in the current editor content) and press Enter, confirm results render with path + tree view.
- **Compare tab**: switch to it, edit both editors with differing JSON, confirm the diff below highlights added/removed/modified fields correctly; confirm invalid JSON on either side shows a validation message instead of a diff.

Stop the dev server after confirming.

- [ ] **Step 5: Commit**

```bash
git add src/tools/json-viewer/JsonViewerPage.tsx
git commit -m "Wire Compare/Escape/Convert/JSONPath into JsonViewerPage"
```

---

## Self-Review Notes

- **Spec coverage:** Compare/Diff (Tasks 4-6, 9), Escape/Unescape (Task 1, 9), Convert YAML/TypeScript (Task 2, 7, 9), JSONPath query (Task 3, 8, 9) — all four Phase 2 features covered, each with pure-logic unit tests plus manual UI verification in Task 9, matching the spec's testing approach.
- **Placeholder scan:** none found — every step has complete code or an exact command with expected output.
- **Type consistency:** `DiffNode`/`DiffStatus` defined once in `diff.ts` (Task 4), consumed identically by `DiffTree.tsx` (Task 5) and `CompareView.tsx` (Task 6). `JsonPathMatch` defined once in `jsonPathQuery.ts` (Task 3), consumed identically by `JsonPathPanel.tsx` (Task 8). `escapeJsonString`/`unescapeJsonString` signatures from Task 1 match their usage in Task 9 exactly. `toYaml`/`toTypeScriptInterface` signatures from Task 2 match their usage in `ConvertModal.tsx` (Task 7) exactly.
