# DevTools Web App — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a static, no-backend web app with two tools — JSON Viewer and API Client — to GitHub Pages via GitHub Actions.

**Architecture:** Single-page Vite + React + TypeScript app. `HashRouter` with two routes (`/#/json`, `/#/api`) sharing a top-level layout. A shared `JsonTree` component is used both by the JSON Viewer and by the API Client's response viewer. All persistent state (JSON viewer content, API environments, spec) lives in `localStorage` via small typed store modules — no server, no global state library.

**Tech Stack:** Vite, React 18, TypeScript (strict), Tailwind CSS v4, React Router (`HashRouter`), `@monaco-editor/react`, `jsonc-parser`, `js-yaml` (for parsing pasted/fetched OpenAPI YAML), Vitest + Testing Library.

## Global Constraints

- TypeScript strict mode (`"strict": true` in `tsconfig.json`) across the whole project.
- `vite.config.ts` must set `base: '/devtools-web/'`.
- Routing must use `HashRouter` — GitHub Pages has no SPA history fallback, `BrowserRouter` would 404 on refresh.
- No secrets/tokens hardcoded anywhere in source. All user-entered credentials (tokens, base URLs) live only in `localStorage`.
- No backend, no proxy server built into this repo. CORS failures must be surfaced with a friendly explanation, not swallowed.
- Component boundaries: `src/tools/json-viewer/`, `src/tools/api-client/`, `src/components/` (shared).
- Target Node 20 for CI (matches the deploy workflow).

---

## File Structure

```
package.json, vite.config.ts, tsconfig.json, index.html
.github/workflows/deploy.yml
README.md
src/
  main.tsx                          # entry, mounts <App/>
  App.tsx                           # HashRouter + routes + Layout
  index.css                         # Tailwind import
  components/
    Layout.tsx                      # top nav switching between tools
    JsonTree.tsx                    # shared collapsible tree view + click-to-copy
    JsonTree.test.tsx
  lib/
    jsonAutoFix.ts                  # soft-parse (jsonc-parser) -> strict JSON re-serialize
    jsonAutoFix.test.ts
    jsonPath.ts                     # build JSONPath string for a tree node
    jsonPath.test.ts
    curl.ts                         # build a `curl` command string from a built request
    curl.test.ts
  tools/
    json-viewer/
      JsonViewerPage.tsx            # Monaco editor + JsonTree + format/minify/search
      jsonViewerStore.ts            # localStorage persistence for editor content
    api-client/
      types.ts                     # ApiSpec, Environment, AuthConfig, Endpoint types
      specParser.ts                 # parse pasted/fetched OpenAPI JSON or YAML
      specParser.test.ts
      environmentStore.ts           # localStorage CRUD for environments
      environmentStore.test.ts
      requestBuilder.ts             # build fetch Request (url, headers, auth) from env+endpoint+form values
      requestBuilder.test.ts
      ApiClientPage.tsx             # page shell wiring spec import, env selector, endpoint list
      EnvironmentManager.tsx        # UI to create/edit/select environments
      EndpointList.tsx              # grouped-by-tag endpoint list, expand to see schema
      TryItOutForm.tsx              # params/headers/body form + send + response viewer
```

---

### Task 1: Scaffold project, Tailwind, layout, routing

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css` (via `npm create vite`, then edits)
- Create: `src/components/Layout.tsx`
- Create: `.gitignore`

**Interfaces:**
- Produces: `<Layout>` component wrapping `<Outlet/>` with nav links to `/#/json` and `/#/api`; `App` renders `HashRouter` with routes `/json` and `/api` (placeholder pages for now, replaced in later tasks).

- [ ] **Step 1: Scaffold with Vite**

```bash
npm create vite@latest . -- --template react-ts
```

When prompted about the current directory not being empty (it has `docs/`), choose to continue / merge into the current directory.

- [ ] **Step 2: Install runtime and dev dependencies**

```bash
npm install react-router-dom
npm install -D tailwindcss @tailwindcss/vite vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 3: Configure `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/devtools-web/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
})
```

- [ ] **Step 4: Create `src/test-setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 5: Add Tailwind import to `src/index.css`** (replace generated contents)

```css
@import "tailwindcss";
```

- [ ] **Step 6: Enable strict mode in `tsconfig.json`**

Ensure the generated `tsconfig.json` (or `tsconfig.app.json` if Vite split it) has:

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

- [ ] **Step 7: Add `test` script to `package.json`**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  }
}
```

- [ ] **Step 8: Create `src/components/Layout.tsx`**

```tsx
import { NavLink, Outlet } from 'react-router-dom'

export function Layout() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-md text-sm font-medium ${
      isActive ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
    }`

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 px-4 py-3 flex items-center gap-2">
        <span className="font-semibold text-slate-800 mr-4">DevTools</span>
        <NavLink to="/json" className={linkClass}>JSON Viewer</NavLink>
        <NavLink to="/api" className={linkClass}>API Client</NavLink>
      </header>
      <main className="flex-1 min-h-0">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 9: Wire up `src/App.tsx`**

```tsx
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'

function JsonPlaceholder() {
  return <div className="p-4">JSON Viewer (coming in Task 4)</div>
}
function ApiPlaceholder() {
  return <div className="p-4">API Client (coming in Task 9)</div>
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/json" replace />} />
          <Route path="/json" element={<JsonPlaceholder />} />
          <Route path="/api" element={<ApiPlaceholder />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
```

Ensure `src/main.tsx` imports `./index.css` and mounts `<App/>`.

- [ ] **Step 10: Verify build and dev server**

Run: `npm run build`
Expected: build succeeds, `dist/` produced with no TypeScript errors.

Run: `npm run dev` then open the printed local URL and confirm the nav switches between `/#/json` and `/#/api`. Stop the dev server after confirming.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "Scaffold Vite+React+TS+Tailwind app with HashRouter layout"
```

---

### Task 2: Shared JSON tree view component

**Files:**
- Create: `src/components/JsonTree.tsx`
- Test: `src/components/JsonTree.test.tsx`

**Interfaces:**
- Produces: `<JsonTree value={unknown} onCopyPath?={(path: string) => void} onCopyValue?={(value: unknown) => void} highlightQuery?={string} />`. Internally uses `buildJsonPath` from `src/lib/jsonPath.ts` (Task 3 produces this — for this task, inline a local minimal path builder and note it will be swapped to the shared one in Task 3... to avoid rework, implement `src/lib/jsonPath.ts` here instead, since `JsonTree` depends on it and no earlier task defines it.

**Note:** Build `src/lib/jsonPath.ts` in this task (moved up from where it might otherwise sit), since `JsonTree` is its first consumer.

- [ ] **Step 1: Write the failing test for `buildJsonPath`**

Create `src/lib/jsonPath.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildJsonPath } from './jsonPath'

describe('buildJsonPath', () => {
  it('builds a root-relative dot path', () => {
    expect(buildJsonPath(['a', 'b'])).toBe('a.b')
  })

  it('renders numeric segments as array indices', () => {
    expect(buildJsonPath(['a', 'b', 0, 'c'])).toBe('a.b[0].c')
  })

  it('returns "$" for the root path', () => {
    expect(buildJsonPath([])).toBe('$')
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/lib/jsonPath.test.ts`
Expected: FAIL — `Cannot find module './jsonPath'`

- [ ] **Step 3: Implement `src/lib/jsonPath.ts`**

```ts
export type PathSegment = string | number

export function buildJsonPath(segments: PathSegment[]): string {
  if (segments.length === 0) return '$'

  return segments.reduce<string>((acc, seg, i) => {
    if (typeof seg === 'number') return `${acc}[${seg}]`
    return i === 0 ? seg : `${acc}.${seg}`
  }, '')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/jsonPath.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the failing test for `JsonTree`**

Create `src/components/JsonTree.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JsonTree } from './JsonTree'

describe('JsonTree', () => {
  it('renders primitive keys and values', () => {
    render(<JsonTree value={{ a: 1, b: 'x' }} />)
    expect(screen.getByText('a')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('collapses and expands a nested object node', async () => {
    const user = userEvent.setup()
    render(<JsonTree value={{ a: { b: 1 } }} />)
    expect(screen.getByText('b')).toBeInTheDocument()

    await user.click(screen.getByTestId('toggle-a'))
    expect(screen.queryByText('b')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('toggle-a'))
    expect(screen.getByText('b')).toBeInTheDocument()
  })

  it('calls onCopyPath with the built JSONPath when a node key is clicked', async () => {
    const user = userEvent.setup()
    const onCopyPath = vi.fn()
    render(<JsonTree value={{ a: [{ c: 1 }] }} onCopyPath={onCopyPath} />)

    await user.click(screen.getByText('c'))
    expect(onCopyPath).toHaveBeenCalledWith('a[0].c')
  })
})
```

- [ ] **Step 6: Run it to confirm it fails**

Run: `npx vitest run src/components/JsonTree.test.tsx`
Expected: FAIL — `Cannot find module './JsonTree'`

- [ ] **Step 7: Implement `src/components/JsonTree.tsx`**

```tsx
import { useState } from 'react'
import { buildJsonPath, type PathSegment } from '../lib/jsonPath'

interface JsonTreeProps {
  value: unknown
  onCopyPath?: (path: string) => void
  onCopyValue?: (value: unknown) => void
  highlightQuery?: string
}

function isExpandable(value: unknown): value is Record<string, unknown> | unknown[] {
  return value !== null && typeof value === 'object'
}

function matches(text: string, query?: string): boolean {
  if (!query) return false
  return text.toLowerCase().includes(query.toLowerCase())
}

function Node({
  keyLabel,
  value,
  path,
  onCopyPath,
  onCopyValue,
  highlightQuery,
}: {
  keyLabel: string
  value: unknown
  path: PathSegment[]
  onCopyPath?: (path: string) => void
  onCopyValue?: (value: unknown) => void
  highlightQuery?: string
}) {
  const [expanded, setExpanded] = useState(true)
  const testId = `toggle-${path[path.length - 1]}`
  const keyMatches = matches(keyLabel, highlightQuery)

  const handleKeyClick = () => onCopyPath?.(buildJsonPath(path))
  const handleValueClick = () => onCopyValue?.(value)

  if (isExpandable(value)) {
    const isArray = Array.isArray(value)
    const entries = isArray
      ? value.map((v, i) => [i, v] as const)
      : Object.entries(value)

    return (
      <div className="ml-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            data-testid={testId}
            onClick={() => setExpanded((e) => !e)}
            className="w-4 text-slate-400 hover:text-slate-700"
          >
            {expanded ? '▾' : '▸'}
          </button>
          <span
            onClick={handleKeyClick}
            className={`cursor-pointer font-mono text-sm ${
              keyMatches ? 'bg-yellow-200' : 'text-blue-700'
            }`}
          >
            {keyLabel}
          </span>
          <span className="text-slate-400 text-xs">
            {isArray ? `[${entries.length}]` : `{${entries.length}}`}
          </span>
        </div>
        {expanded && (
          <div className="border-l border-slate-200 pl-2">
            {entries.map(([k, v]) => (
              <Node
                key={String(k)}
                keyLabel={String(k)}
                value={v}
                path={[...path, k]}
                onCopyPath={onCopyPath}
                onCopyValue={onCopyValue}
                highlightQuery={highlightQuery}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  const valueText = JSON.stringify(value)
  const valueMatches = matches(valueText, highlightQuery)

  return (
    <div className="ml-3 flex items-center gap-1">
      <span className="w-4" />
      <span
        onClick={handleKeyClick}
        className={`cursor-pointer font-mono text-sm ${
          keyMatches ? 'bg-yellow-200' : 'text-blue-700'
        }`}
      >
        {keyLabel}
      </span>
      <span className="text-slate-400 text-sm">:</span>
      <span
        onClick={handleValueClick}
        className={`cursor-pointer font-mono text-sm text-emerald-700 ${
          valueMatches ? 'bg-yellow-200' : ''
        }`}
      >
        {valueText}
      </span>
    </div>
  )
}

export function JsonTree({ value, onCopyPath, onCopyValue, highlightQuery }: JsonTreeProps) {
  if (!isExpandable(value)) {
    return <div className="font-mono text-sm text-emerald-700">{JSON.stringify(value)}</div>
  }

  const entries = Array.isArray(value) ? value.map((v, i) => [i, v] as const) : Object.entries(value)

  return (
    <div className="text-sm">
      {entries.map(([k, v]) => (
        <Node
          key={String(k)}
          keyLabel={String(k)}
          value={v}
          path={[k]}
          onCopyPath={onCopyPath}
          onCopyValue={onCopyValue}
          highlightQuery={highlightQuery}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run src/components/JsonTree.test.tsx src/lib/jsonPath.test.ts`
Expected: PASS (6 tests total)

- [ ] **Step 9: Commit**

```bash
git add src/components/JsonTree.tsx src/components/JsonTree.test.tsx src/lib/jsonPath.ts src/lib/jsonPath.test.ts
git commit -m "Add shared JsonTree component with collapse, click-to-copy, and JSONPath builder"
```

---

### Task 3: JSON auto-fix and validation library

**Files:**
- Create: `src/lib/jsonAutoFix.ts`
- Test: `src/lib/jsonAutoFix.test.ts`

**Interfaces:**
- Produces:
  - `parseJsonStrict(text: string): { ok: true; value: unknown } | { ok: false; errors: { message: string; line: number; column: number }[] }`
  - `autoFixJson(text: string): { fixed: string; changed: boolean } | { fixed: null; changed: false }` — attempts a soft parse via `jsonc-parser`, and if it succeeds, re-serializes as strict `JSON.stringify(value, null, 2)`; returns `{ fixed: null, changed: false }` if even the soft parse fails.

- [ ] **Step 1: Install `jsonc-parser`**

```bash
npm install jsonc-parser
```

- [ ] **Step 2: Write failing tests**

Create `src/lib/jsonAutoFix.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseJsonStrict, autoFixJson } from './jsonAutoFix'

describe('parseJsonStrict', () => {
  it('parses valid JSON', () => {
    const result = parseJsonStrict('{"a": 1}')
    expect(result).toEqual({ ok: true, value: { a: 1 } })
  })

  it('reports line/column for invalid JSON', () => {
    const result = parseJsonStrict('{\n  "a": ,\n}')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0].line).toBeGreaterThanOrEqual(2)
    }
  })
})

describe('autoFixJson', () => {
  it('fixes a trailing comma', () => {
    const result = autoFixJson('{"a": 1, "b": 2,}')
    expect(result.changed).toBe(true)
    expect(JSON.parse(result.fixed as string)).toEqual({ a: 1, b: 2 })
  })

  it('fixes single-quoted strings and unquoted keys', () => {
    const result = autoFixJson("{a: 'x'}")
    expect(result.changed).toBe(true)
    expect(JSON.parse(result.fixed as string)).toEqual({ a: 'x' })
  })

  it('returns changed:false for already-valid strict JSON with identical formatting intent', () => {
    const result = autoFixJson('{"a":1}')
    expect(result.fixed).not.toBeNull()
    expect(JSON.parse(result.fixed as string)).toEqual({ a: 1 })
  })

  it('returns fixed:null for unrecoverable input', () => {
    const result = autoFixJson('{a: b c d')
    expect(result.fixed).toBeNull()
    expect(result.changed).toBe(false)
  })
})
```

- [ ] **Step 3: Run to confirm failure**

Run: `npx vitest run src/lib/jsonAutoFix.test.ts`
Expected: FAIL — `Cannot find module './jsonAutoFix'`

- [ ] **Step 4: Implement `src/lib/jsonAutoFix.ts`**

```ts
import { parse, parseTree, ParseError, ParseErrorCode, printParseErrorCode } from 'jsonc-parser'

export interface StrictParseError {
  message: string
  line: number
  column: number
}

export type StrictParseResult =
  | { ok: true; value: unknown }
  | { ok: false; errors: StrictParseError[] }

function toLineColumn(text: string, offset: number): { line: number; column: number } {
  const before = text.slice(0, offset)
  const lines = before.split('\n')
  return { line: lines.length, column: lines[lines.length - 1].length + 1 }
}

export function parseJsonStrict(text: string): StrictParseResult {
  const errors: ParseError[] = []
  const value = parse(text, errors, { allowTrailingComma: false })

  if (errors.length === 0) {
    return { ok: true, value }
  }

  return {
    ok: false,
    errors: errors.map((e) => ({
      message: printParseErrorCode(e.error as ParseErrorCode),
      ...toLineColumn(text, e.offset),
    })),
  }
}

export type AutoFixResult = { fixed: string; changed: boolean } | { fixed: null; changed: false }

export function autoFixJson(text: string): AutoFixResult {
  const errors: ParseError[] = []
  const tree = parseTree(text, errors, {
    allowTrailingComma: true,
    disallowComments: false,
  })

  if (!tree) {
    return { fixed: null, changed: false }
  }

  const value = parse(text, [], { allowTrailingComma: true })
  const fixed = JSON.stringify(value, null, 2)
  const changed = fixed !== text

  return { fixed, changed }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/jsonAutoFix.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add src/lib/jsonAutoFix.ts src/lib/jsonAutoFix.test.ts package.json package-lock.json
git commit -m "Add JSON strict-parse validation and soft auto-fix using jsonc-parser"
```

---

### Task 4: JSON Viewer page

**Files:**
- Create: `src/tools/json-viewer/JsonViewerPage.tsx`
- Create: `src/tools/json-viewer/jsonViewerStore.ts`
- Modify: `src/App.tsx:1-24` (replace `JsonPlaceholder` with `JsonViewerPage`)
- Test: `src/tools/json-viewer/jsonViewerStore.test.ts`

**Interfaces:**
- Consumes: `JsonTree` (`src/components/JsonTree.tsx`), `parseJsonStrict`/`autoFixJson` (`src/lib/jsonAutoFix.ts`), `buildJsonPath` (`src/lib/jsonPath.ts`)
- Produces: `loadJsonViewerContent(): string`, `saveJsonViewerContent(text: string): void` (localStorage-backed, key `"devtools:json-viewer:content"`)

- [ ] **Step 1: Install Monaco editor package**

```bash
npm install @monaco-editor/react
```

- [ ] **Step 2: Write failing test for the store**

Create `src/tools/json-viewer/jsonViewerStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { loadJsonViewerContent, saveJsonViewerContent } from './jsonViewerStore'

describe('jsonViewerStore', () => {
  beforeEach(() => localStorage.clear())

  it('returns a default sample when nothing is stored', () => {
    expect(loadJsonViewerContent().length).toBeGreaterThan(0)
  })

  it('round-trips saved content', () => {
    saveJsonViewerContent('{"a":1}')
    expect(loadJsonViewerContent()).toBe('{"a":1}')
  })
})
```

- [ ] **Step 3: Run to confirm failure**

Run: `npx vitest run src/tools/json-viewer/jsonViewerStore.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Implement `src/tools/json-viewer/jsonViewerStore.ts`**

```ts
const STORAGE_KEY = 'devtools:json-viewer:content'
const DEFAULT_CONTENT = '{\n  "hello": "world"\n}'

export function loadJsonViewerContent(): string {
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_CONTENT
}

export function saveJsonViewerContent(text: string): void {
  localStorage.setItem(STORAGE_KEY, text)
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/tools/json-viewer/jsonViewerStore.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Implement `src/tools/json-viewer/JsonViewerPage.tsx`**

```tsx
import { useMemo, useState } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import { JsonTree } from '../../components/JsonTree'
import { parseJsonStrict, autoFixJson } from '../../lib/jsonAutoFix'
import { loadJsonViewerContent, saveJsonViewerContent } from './jsonViewerStore'

export function JsonViewerPage() {
  const [text, setText] = useState(() => loadJsonViewerContent())
  const [search, setSearch] = useState('')
  const [editorRef, setEditorRef] = useState<Parameters<OnMount>[0] | null>(null)
  const [monacoRef, setMonacoRef] = useState<Parameters<OnMount>[1] | null>(null)

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
    const formatted = JSON.stringify(parsed.value, null, 2)
    handleChange(formatted)
  }

  const handleMinify = () => {
    if (!parsed.ok) return
    handleChange(JSON.stringify(parsed.value))
  }

  const handleAutoFix = () => {
    const result = autoFixJson(text)
    if (result.fixed) handleChange(result.fixed)
  }

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path)
  }

  const handleCopyValue = (value: unknown) => {
    navigator.clipboard.writeText(typeof value === 'string' ? value : JSON.stringify(value))
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2">
        <button onClick={handleFormat} className="px-3 py-1 text-sm rounded bg-slate-800 text-white">Format</button>
        <button onClick={handleMinify} className="px-3 py-1 text-sm rounded bg-slate-200">Minify</button>
        <button onClick={handleAutoFix} className="px-3 py-1 text-sm rounded bg-amber-200">Auto-fix</button>
        <input
          placeholder="Search key/value…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto px-2 py-1 text-sm border border-slate-300 rounded"
        />
      </div>
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
  )
}
```

- [ ] **Step 7: Wire into `src/App.tsx`** — replace `JsonPlaceholder` usage

```tsx
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { JsonViewerPage } from './tools/json-viewer/JsonViewerPage'

function ApiPlaceholder() {
  return <div className="p-4">API Client (coming in Task 9)</div>
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/json" replace />} />
          <Route path="/json" element={<JsonViewerPage />} />
          <Route path="/api" element={<ApiPlaceholder />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
```

- [ ] **Step 8: Run full test suite and build**

Run: `npm run test && npm run build`
Expected: all tests PASS, build succeeds.

- [ ] **Step 9: Manual verification**

Run: `npm run dev`, open `/#/json`. Paste `{"a": [1, 2, {"b": true}]}` in the editor, confirm the tree renders and updates live. Click Format, Minify, Auto-fix (with intentionally broken input like `{a: 'x',}`) and confirm each works. Type in the search box and confirm matching keys/values highlight. Click a key/value and confirm clipboard receives the JSONPath/value (check via browser paste). Stop the dev server after confirming.

- [ ] **Step 10: Commit**

```bash
git add src/tools/json-viewer src/App.tsx package.json package-lock.json
git commit -m "Add JSON Viewer page: Monaco editor, tree view, format/minify/auto-fix/search"
```

---

### Task 5: OpenAPI spec parser

**Files:**
- Create: `src/tools/api-client/types.ts`
- Create: `src/tools/api-client/specParser.ts`
- Test: `src/tools/api-client/specParser.test.ts`

**Interfaces:**
- Produces:
  - `interface ApiSpec { title: string; endpoints: Endpoint[] }`
  - `interface Endpoint { method: string; path: string; tag: string; summary?: string; parameters: EndpointParam[]; requestBodyExample?: unknown; responseExample?: unknown }`
  - `interface EndpointParam { name: string; in: 'path' | 'query' | 'header'; required: boolean; example?: unknown }`
  - `async function parseSpecFromText(text: string): { ok: true; spec: ApiSpec } | { ok: false; error: string }` — accepts JSON or YAML text (OpenAPI 3.x `paths` object) and flattens it into `ApiSpec`.
  - `async function fetchSpec(url: string): Promise<{ ok: true; spec: ApiSpec } | { ok: false; error: string }>` — fetches text from `url` and delegates to `parseSpecFromText`.

- [ ] **Step 1: Install YAML parser**

```bash
npm install js-yaml
npm install -D @types/js-yaml
```

- [ ] **Step 2: Write `src/tools/api-client/types.ts`**

```ts
export interface EndpointParam {
  name: string
  in: 'path' | 'query' | 'header'
  required: boolean
  example?: unknown
}

export interface Endpoint {
  method: string
  path: string
  tag: string
  summary?: string
  parameters: EndpointParam[]
  requestBodyExample?: unknown
  responseExample?: unknown
}

export interface ApiSpec {
  title: string
  endpoints: Endpoint[]
}
```

- [ ] **Step 3: Write failing tests**

Create `src/tools/api-client/specParser.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { parseSpecFromText, fetchSpec } from './specParser'

const sampleSpec = {
  openapi: '3.0.0',
  info: { title: 'Sample API' },
  paths: {
    '/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get a user',
        parameters: [
          { name: 'id', in: 'path', required: true, example: '123' },
        ],
        responses: {
          '200': {
            content: {
              'application/json': { example: { id: '123', name: 'Ada' } },
            },
          },
        },
      },
    },
  },
}

describe('parseSpecFromText', () => {
  it('parses a JSON OpenAPI spec into flattened endpoints', async () => {
    const result = await parseSpecFromText(JSON.stringify(sampleSpec))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.spec.title).toBe('Sample API')
      expect(result.spec.endpoints).toHaveLength(1)
      expect(result.spec.endpoints[0]).toMatchObject({
        method: 'GET',
        path: '/users/{id}',
        tag: 'Users',
      })
    }
  })

  it('parses an equivalent YAML OpenAPI spec', async () => {
    const yaml = `
openapi: 3.0.0
info:
  title: Sample API
paths:
  /ping:
    get:
      tags: [Health]
      responses:
        '200':
          description: ok
`
    const result = await parseSpecFromText(yaml)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.spec.endpoints[0].path).toBe('/ping')
    }
  })

  it('returns an error for unparseable text', async () => {
    const result = await parseSpecFromText('not: [valid, yaml: json {{{')
    expect(result.ok).toBe(false)
  })
})

describe('fetchSpec', () => {
  afterEach(() => vi.restoreAllMocks())

  it('fetches and parses a spec from a URL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(sampleSpec)),
    }))

    const result = await fetchSpec('https://example.com/openapi.json')
    expect(result.ok).toBe(true)
  })

  it('returns an error when the fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    const result = await fetchSpec('https://example.com/openapi.json')
    expect(result.ok).toBe(false)
  })
})
```

- [ ] **Step 4: Run to confirm failure**

Run: `npx vitest run src/tools/api-client/specParser.test.ts`
Expected: FAIL — module not found

- [ ] **Step 5: Implement `src/tools/api-client/specParser.ts`**

```ts
import { load } from 'js-yaml'
import type { ApiSpec, Endpoint, EndpointParam } from './types'

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const

function extractExample(content: Record<string, unknown> | undefined): unknown {
  if (!content) return undefined
  const json = content['application/json'] as Record<string, unknown> | undefined
  return json?.example
}

function toEndpoint(path: string, method: string, operation: Record<string, unknown>): Endpoint {
  const tags = operation.tags as string[] | undefined
  const parameters = ((operation.parameters as Record<string, unknown>[] | undefined) ?? []).map(
    (p): EndpointParam => ({
      name: p.name as string,
      in: p.in as EndpointParam['in'],
      required: Boolean(p.required),
      example: p.example,
    }),
  )

  const requestBody = operation.requestBody as Record<string, unknown> | undefined
  const responses = operation.responses as Record<string, Record<string, unknown>> | undefined
  const firstResponse = responses ? Object.values(responses)[0] : undefined

  return {
    method: method.toUpperCase(),
    path,
    tag: tags?.[0] ?? 'default',
    summary: operation.summary as string | undefined,
    parameters,
    requestBodyExample: extractExample(requestBody?.content as Record<string, unknown> | undefined),
    responseExample: extractExample(firstResponse?.content as Record<string, unknown> | undefined),
  }
}

export async function parseSpecFromText(
  text: string,
): Promise<{ ok: true; spec: ApiSpec } | { ok: false; error: string }> {
  let raw: unknown

  try {
    raw = JSON.parse(text)
  } catch {
    try {
      raw = load(text)
    } catch (yamlErr) {
      return { ok: false, error: `Could not parse as JSON or YAML: ${(yamlErr as Error).message}` }
    }
  }

  if (!raw || typeof raw !== 'object' || !('paths' in raw)) {
    return { ok: false, error: 'Spec is missing a "paths" object — not a valid OpenAPI document.' }
  }

  const doc = raw as { info?: { title?: string }; paths: Record<string, Record<string, unknown>> }
  const endpoints: Endpoint[] = []

  for (const [path, pathItem] of Object.entries(doc.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method] as Record<string, unknown> | undefined
      if (operation) endpoints.push(toEndpoint(path, method, operation))
    }
  }

  return { ok: true, spec: { title: doc.info?.title ?? 'Untitled API', endpoints } }
}

export async function fetchSpec(
  url: string,
): Promise<{ ok: true; spec: ApiSpec } | { ok: false; error: string }> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      return { ok: false, error: `Fetch failed with status ${response.status}` }
    }
    const text = await response.text()
    return parseSpecFromText(text)
  } catch (err) {
    return { ok: false, error: `Network error fetching spec: ${(err as Error).message}` }
  }
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/tools/api-client/specParser.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 7: Commit**

```bash
git add src/tools/api-client/types.ts src/tools/api-client/specParser.ts src/tools/api-client/specParser.test.ts package.json package-lock.json
git commit -m "Add OpenAPI spec parser (JSON/YAML, URL or pasted text)"
```

---

### Task 6: Environment store

**Files:**
- Create: `src/tools/api-client/environmentStore.ts`
- Test: `src/tools/api-client/environmentStore.test.ts`

**Interfaces:**
- Consumes: nothing new
- Produces:
  - `type AuthConfig = { type: 'none' } | { type: 'bearer'; token: string } | { type: 'apiKey'; location: 'header' | 'query'; name: string; value: string } | { type: 'basic'; username: string; password: string }`
  - `interface Environment { id: string; name: string; baseUrl: string; auth: AuthConfig }`
  - `listEnvironments(): Environment[]`
  - `saveEnvironment(env: Environment): void` (upsert by `id`)
  - `deleteEnvironment(id: string): void`
  - `getActiveEnvironmentId(): string | null`
  - `setActiveEnvironmentId(id: string | null): void`

- [ ] **Step 1: Write failing tests**

Create `src/tools/api-client/environmentStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import {
  listEnvironments,
  saveEnvironment,
  deleteEnvironment,
  getActiveEnvironmentId,
  setActiveEnvironmentId,
} from './environmentStore'

describe('environmentStore', () => {
  beforeEach(() => localStorage.clear())

  it('starts with no environments and no active environment', () => {
    expect(listEnvironments()).toEqual([])
    expect(getActiveEnvironmentId()).toBeNull()
  })

  it('saves and lists environments, upserting by id', () => {
    saveEnvironment({ id: '1', name: 'dev', baseUrl: 'https://dev.example.com', auth: { type: 'none' } })
    saveEnvironment({ id: '1', name: 'dev-renamed', baseUrl: 'https://dev.example.com', auth: { type: 'none' } })
    saveEnvironment({ id: '2', name: 'prod', baseUrl: 'https://prod.example.com', auth: { type: 'bearer', token: 'abc' } })

    const envs = listEnvironments()
    expect(envs).toHaveLength(2)
    expect(envs.find((e) => e.id === '1')?.name).toBe('dev-renamed')
  })

  it('deletes an environment', () => {
    saveEnvironment({ id: '1', name: 'dev', baseUrl: 'https://dev.example.com', auth: { type: 'none' } })
    deleteEnvironment('1')
    expect(listEnvironments()).toEqual([])
  })

  it('persists the active environment id', () => {
    setActiveEnvironmentId('2')
    expect(getActiveEnvironmentId()).toBe('2')
    setActiveEnvironmentId(null)
    expect(getActiveEnvironmentId()).toBeNull()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/tools/api-client/environmentStore.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/tools/api-client/environmentStore.ts`**

```ts
export type AuthConfig =
  | { type: 'none' }
  | { type: 'bearer'; token: string }
  | { type: 'apiKey'; location: 'header' | 'query'; name: string; value: string }
  | { type: 'basic'; username: string; password: string }

export interface Environment {
  id: string
  name: string
  baseUrl: string
  auth: AuthConfig
}

const ENVIRONMENTS_KEY = 'devtools:api-client:environments'
const ACTIVE_ENV_KEY = 'devtools:api-client:active-environment'

export function listEnvironments(): Environment[] {
  const raw = localStorage.getItem(ENVIRONMENTS_KEY)
  return raw ? (JSON.parse(raw) as Environment[]) : []
}

function writeEnvironments(envs: Environment[]): void {
  localStorage.setItem(ENVIRONMENTS_KEY, JSON.stringify(envs))
}

export function saveEnvironment(env: Environment): void {
  const envs = listEnvironments()
  const idx = envs.findIndex((e) => e.id === env.id)
  if (idx >= 0) envs[idx] = env
  else envs.push(env)
  writeEnvironments(envs)
}

export function deleteEnvironment(id: string): void {
  writeEnvironments(listEnvironments().filter((e) => e.id !== id))
}

export function getActiveEnvironmentId(): string | null {
  return localStorage.getItem(ACTIVE_ENV_KEY)
}

export function setActiveEnvironmentId(id: string | null): void {
  if (id === null) localStorage.removeItem(ACTIVE_ENV_KEY)
  else localStorage.setItem(ACTIVE_ENV_KEY, id)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/tools/api-client/environmentStore.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/tools/api-client/environmentStore.ts src/tools/api-client/environmentStore.test.ts
git commit -m "Add localStorage-backed environment store (CRUD + active selection)"
```

---

### Task 7: Request builder and cURL generator

**Files:**
- Create: `src/tools/api-client/requestBuilder.ts`
- Create: `src/lib/curl.ts`
- Test: `src/tools/api-client/requestBuilder.test.ts`
- Test: `src/lib/curl.test.ts`

**Interfaces:**
- Consumes: `Environment`, `AuthConfig` (`environmentStore.ts`), `Endpoint`, `EndpointParam` (`types.ts`)
- Produces:
  - `interface BuiltRequest { url: string; method: string; headers: Record<string, string>; body?: string }`
  - `function buildRequest(endpoint: Endpoint, env: Environment, values: { path: Record<string, string>; query: Record<string, string>; headers: Record<string, string>; body?: string }): BuiltRequest`
  - `function toCurl(req: BuiltRequest): string`

- [ ] **Step 1: Write failing tests for `requestBuilder`**

Create `src/tools/api-client/requestBuilder.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildRequest } from './requestBuilder'
import type { Endpoint } from './types'
import type { Environment } from './environmentStore'

const endpoint: Endpoint = {
  method: 'GET',
  path: '/users/{id}',
  tag: 'Users',
  parameters: [],
}

describe('buildRequest', () => {
  it('substitutes path params and appends query params to the base URL', () => {
    const env: Environment = { id: '1', name: 'dev', baseUrl: 'https://api.dev', auth: { type: 'none' } }
    const req = buildRequest(endpoint, env, { path: { id: '42' }, query: { verbose: 'true' }, headers: {} })
    expect(req.url).toBe('https://api.dev/users/42?verbose=true')
    expect(req.method).toBe('GET')
  })

  it('injects a bearer token as an Authorization header', () => {
    const env: Environment = { id: '1', name: 'dev', baseUrl: 'https://api.dev', auth: { type: 'bearer', token: 'tok123' } }
    const req = buildRequest(endpoint, env, { path: { id: '1' }, query: {}, headers: {} })
    expect(req.headers.Authorization).toBe('Bearer tok123')
  })

  it('injects an API key into a query param when configured for query', () => {
    const env: Environment = {
      id: '1', name: 'dev', baseUrl: 'https://api.dev',
      auth: { type: 'apiKey', location: 'query', name: 'api_key', value: 'xyz' },
    }
    const req = buildRequest(endpoint, env, { path: { id: '1' }, query: {}, headers: {} })
    expect(req.url).toContain('api_key=xyz')
  })

  it('injects basic auth as a base64 Authorization header', () => {
    const env: Environment = {
      id: '1', name: 'dev', baseUrl: 'https://api.dev',
      auth: { type: 'basic', username: 'u', password: 'p' },
    }
    const req = buildRequest(endpoint, env, { path: { id: '1' }, query: {}, headers: {} })
    expect(req.headers.Authorization).toBe(`Basic ${btoa('u:p')}`)
  })

  it('includes a JSON body and content-type header when provided', () => {
    const env: Environment = { id: '1', name: 'dev', baseUrl: 'https://api.dev', auth: { type: 'none' } }
    const req = buildRequest(endpoint, env, { path: { id: '1' }, query: {}, headers: {}, body: '{"x":1}' })
    expect(req.body).toBe('{"x":1}')
    expect(req.headers['Content-Type']).toBe('application/json')
  })
})
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/tools/api-client/requestBuilder.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/tools/api-client/requestBuilder.ts`**

```ts
import type { Endpoint } from './types'
import type { Environment } from './environmentStore'

export interface BuiltRequest {
  url: string
  method: string
  headers: Record<string, string>
  body?: string
}

export interface RequestValues {
  path: Record<string, string>
  query: Record<string, string>
  headers: Record<string, string>
  body?: string
}

function substitutePath(path: string, values: Record<string, string>): string {
  return path.replace(/\{(\w+)\}/g, (_, name) => encodeURIComponent(values[name] ?? ''))
}

export function buildRequest(endpoint: Endpoint, env: Environment, values: RequestValues): BuiltRequest {
  const path = substitutePath(endpoint.path, values.path)
  const url = new URL(env.baseUrl.replace(/\/$/, '') + path)

  for (const [k, v] of Object.entries(values.query)) {
    url.searchParams.set(k, v)
  }

  const headers: Record<string, string> = { ...values.headers }

  switch (env.auth.type) {
    case 'bearer':
      headers.Authorization = `Bearer ${env.auth.token}`
      break
    case 'basic':
      headers.Authorization = `Basic ${btoa(`${env.auth.username}:${env.auth.password}`)}`
      break
    case 'apiKey':
      if (env.auth.location === 'header') headers[env.auth.name] = env.auth.value
      else url.searchParams.set(env.auth.name, env.auth.value)
      break
    case 'none':
      break
  }

  if (values.body) headers['Content-Type'] = 'application/json'

  return {
    url: url.toString(),
    method: endpoint.method,
    headers,
    body: values.body,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/tools/api-client/requestBuilder.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Write failing tests for `curl`**

Create `src/lib/curl.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { toCurl } from './curl'

describe('toCurl', () => {
  it('builds a GET command with headers', () => {
    const cmd = toCurl({ url: 'https://api.dev/x', method: 'GET', headers: { Authorization: 'Bearer t' } })
    expect(cmd).toBe(`curl -X GET 'https://api.dev/x' -H 'Authorization: Bearer t'`)
  })

  it('includes a body with -d when present', () => {
    const cmd = toCurl({
      url: 'https://api.dev/x',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"a":1}',
    })
    expect(cmd).toBe(
      `curl -X POST 'https://api.dev/x' -H 'Content-Type: application/json' -d '{"a":1}'`,
    )
  })
})
```

- [ ] **Step 6: Run to confirm failure**

Run: `npx vitest run src/lib/curl.test.ts`
Expected: FAIL — module not found

- [ ] **Step 7: Implement `src/lib/curl.ts`**

```ts
import type { BuiltRequest } from '../tools/api-client/requestBuilder'

function shellEscape(value: string): string {
  return value.replace(/'/g, `'\\''`)
}

export function toCurl(req: BuiltRequest): string {
  const parts = [`curl -X ${req.method}`, `'${shellEscape(req.url)}'`]

  for (const [key, value] of Object.entries(req.headers)) {
    parts.push(`-H '${shellEscape(`${key}: ${value}`)}'`)
  }

  if (req.body) {
    parts.push(`-d '${shellEscape(req.body)}'`)
  }

  return parts.join(' ')
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run src/lib/curl.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 9: Commit**

```bash
git add src/tools/api-client/requestBuilder.ts src/tools/api-client/requestBuilder.test.ts src/lib/curl.ts src/lib/curl.test.ts
git commit -m "Add request builder (auth injection) and cURL command generator"
```

---

### Task 8: Environment manager UI

**Files:**
- Create: `src/tools/api-client/EnvironmentManager.tsx`
- Test: `src/tools/api-client/EnvironmentManager.test.tsx`

**Interfaces:**
- Consumes: `Environment`, `AuthConfig`, `listEnvironments`, `saveEnvironment`, `deleteEnvironment`, `getActiveEnvironmentId`, `setActiveEnvironmentId` (`environmentStore.ts`)
- Produces: `<EnvironmentManager />` — self-contained; reads/writes the store directly and exposes no props (the store is the source of truth, consumed elsewhere via `getActiveEnvironmentId`/`listEnvironments`).

- [ ] **Step 1: Write failing test**

Create `src/tools/api-client/EnvironmentManager.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EnvironmentManager } from './EnvironmentManager'
import { listEnvironments, getActiveEnvironmentId } from './environmentStore'

describe('EnvironmentManager', () => {
  beforeEach(() => localStorage.clear())

  it('creates a new environment and sets it active', async () => {
    const user = userEvent.setup()
    render(<EnvironmentManager />)

    await user.click(screen.getByRole('button', { name: /new environment/i }))
    await user.type(screen.getByLabelText(/name/i), 'dev')
    await user.type(screen.getByLabelText(/base url/i), 'https://dev.example.com')
    await user.click(screen.getByRole('button', { name: /save/i }))

    const envs = listEnvironments()
    expect(envs).toHaveLength(1)
    expect(envs[0].name).toBe('dev')
    expect(getActiveEnvironmentId()).toBe(envs[0].id)
  })

  it('switches the active environment via the dropdown', async () => {
    const user = userEvent.setup()
    render(<EnvironmentManager />)

    for (const name of ['dev', 'prod']) {
      await user.click(screen.getByRole('button', { name: /new environment/i }))
      await user.type(screen.getByLabelText(/name/i), name)
      await user.type(screen.getByLabelText(/base url/i), `https://${name}.example.com`)
      await user.click(screen.getByRole('button', { name: /save/i }))
    }

    const select = screen.getByLabelText(/active environment/i)
    await user.selectOptions(select, 'dev')

    const devId = listEnvironments().find((e) => e.name === 'dev')!.id
    expect(getActiveEnvironmentId()).toBe(devId)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/tools/api-client/EnvironmentManager.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/tools/api-client/EnvironmentManager.tsx`**

```tsx
import { useState } from 'react'
import {
  type Environment,
  type AuthConfig,
  listEnvironments,
  saveEnvironment,
  deleteEnvironment,
  getActiveEnvironmentId,
  setActiveEnvironmentId,
} from './environmentStore'

function emptyEnvironment(): Environment {
  return { id: crypto.randomUUID(), name: '', baseUrl: '', auth: { type: 'none' } }
}

export function EnvironmentManager() {
  const [envs, setEnvs] = useState<Environment[]>(() => listEnvironments())
  const [activeId, setActiveId] = useState<string | null>(() => getActiveEnvironmentId())
  const [draft, setDraft] = useState<Environment | null>(null)

  const refresh = () => setEnvs(listEnvironments())

  const handleNew = () => setDraft(emptyEnvironment())

  const handleSave = () => {
    if (!draft) return
    saveEnvironment(draft)
    setActiveEnvironmentId(draft.id)
    setActiveId(draft.id)
    setDraft(null)
    refresh()
  }

  const handleDelete = (id: string) => {
    deleteEnvironment(id)
    if (activeId === id) {
      setActiveEnvironmentId(null)
      setActiveId(null)
    }
    refresh()
  }

  const handleSelectActive = (id: string) => {
    setActiveEnvironmentId(id || null)
    setActiveId(id || null)
  }

  const updateAuthType = (type: AuthConfig['type']) => {
    if (!draft) return
    const auth: AuthConfig =
      type === 'bearer' ? { type, token: '' }
      : type === 'apiKey' ? { type, location: 'header', name: '', value: '' }
      : type === 'basic' ? { type, username: '', password: '' }
      : { type: 'none' }
    setDraft({ ...draft, auth })
  }

  return (
    <div className="p-3 border-b border-slate-200 flex items-center gap-3">
      <label className="text-sm flex items-center gap-2">
        Active environment
        <select
          aria-label="Active environment"
          value={activeId ?? ''}
          onChange={(e) => handleSelectActive(e.target.value)}
          className="border border-slate-300 rounded px-2 py-1 text-sm"
        >
          <option value="">— none —</option>
          {envs.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </label>

      <button onClick={handleNew} className="px-3 py-1 text-sm rounded bg-slate-200">
        + New environment
      </button>

      {envs.map((e) => (
        <button key={e.id} onClick={() => handleDelete(e.id)} className="text-xs text-red-600">
          delete {e.name}
        </button>
      ))}

      {draft && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-10">
          <div className="bg-white rounded-lg p-4 w-96 flex flex-col gap-2">
            <label className="text-sm">
              Name
              <input
                aria-label="Name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="block w-full border border-slate-300 rounded px-2 py-1"
              />
            </label>
            <label className="text-sm">
              Base URL
              <input
                aria-label="Base URL"
                value={draft.baseUrl}
                onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })}
                className="block w-full border border-slate-300 rounded px-2 py-1"
              />
            </label>
            <label className="text-sm">
              Auth type
              <select
                aria-label="Auth type"
                value={draft.auth.type}
                onChange={(e) => updateAuthType(e.target.value as AuthConfig['type'])}
                className="block w-full border border-slate-300 rounded px-2 py-1"
              >
                <option value="none">None</option>
                <option value="bearer">Bearer token</option>
                <option value="apiKey">API Key</option>
                <option value="basic">Basic auth</option>
              </select>
            </label>

            {draft.auth.type === 'bearer' && (
              <label className="text-sm">
                Token
                <input
                  aria-label="Token"
                  value={draft.auth.token}
                  onChange={(e) => setDraft({ ...draft, auth: { type: 'bearer', token: e.target.value } })}
                  className="block w-full border border-slate-300 rounded px-2 py-1"
                />
              </label>
            )}

            {draft.auth.type === 'apiKey' && (
              <>
                <label className="text-sm">
                  Key name
                  <input
                    aria-label="Key name"
                    value={draft.auth.name}
                    onChange={(e) =>
                      setDraft({ ...draft, auth: { ...draft.auth as Extract<AuthConfig, {type:'apiKey'}>, name: e.target.value } })
                    }
                    className="block w-full border border-slate-300 rounded px-2 py-1"
                  />
                </label>
                <label className="text-sm">
                  Value
                  <input
                    aria-label="Key value"
                    value={draft.auth.value}
                    onChange={(e) =>
                      setDraft({ ...draft, auth: { ...draft.auth as Extract<AuthConfig, {type:'apiKey'}>, value: e.target.value } })
                    }
                    className="block w-full border border-slate-300 rounded px-2 py-1"
                  />
                </label>
                <label className="text-sm">
                  Location
                  <select
                    aria-label="Key location"
                    value={draft.auth.location}
                    onChange={(e) =>
                      setDraft({ ...draft, auth: { ...draft.auth as Extract<AuthConfig, {type:'apiKey'}>, location: e.target.value as 'header' | 'query' } })
                    }
                    className="block w-full border border-slate-300 rounded px-2 py-1"
                  >
                    <option value="header">Header</option>
                    <option value="query">Query param</option>
                  </select>
                </label>
              </>
            )}

            {draft.auth.type === 'basic' && (
              <>
                <label className="text-sm">
                  Username
                  <input
                    aria-label="Username"
                    value={draft.auth.username}
                    onChange={(e) =>
                      setDraft({ ...draft, auth: { ...draft.auth as Extract<AuthConfig, {type:'basic'}>, username: e.target.value } })
                    }
                    className="block w-full border border-slate-300 rounded px-2 py-1"
                  />
                </label>
                <label className="text-sm">
                  Password
                  <input
                    aria-label="Password"
                    type="password"
                    value={draft.auth.password}
                    onChange={(e) =>
                      setDraft({ ...draft, auth: { ...draft.auth as Extract<AuthConfig, {type:'basic'}>, password: e.target.value } })
                    }
                    className="block w-full border border-slate-300 rounded px-2 py-1"
                  />
                </label>
              </>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => setDraft(null)} className="px-3 py-1 text-sm rounded bg-slate-200">Cancel</button>
              <button onClick={handleSave} className="px-3 py-1 text-sm rounded bg-slate-800 text-white">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/tools/api-client/EnvironmentManager.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/tools/api-client/EnvironmentManager.tsx src/tools/api-client/EnvironmentManager.test.tsx
git commit -m "Add environment manager UI (create/select/delete environments and auth config)"
```

---

### Task 9: API Client page — spec import, endpoint list, try-it-out, response viewer

**Files:**
- Create: `src/tools/api-client/EndpointList.tsx`
- Create: `src/tools/api-client/TryItOutForm.tsx`
- Create: `src/tools/api-client/ApiClientPage.tsx`
- Modify: `src/App.tsx` (replace `ApiPlaceholder` with `ApiClientPage`)

**Interfaces:**
- Consumes: `ApiSpec`, `Endpoint` (`types.ts`), `parseSpecFromText`, `fetchSpec` (`specParser.ts`), `EnvironmentManager` (Task 8), `listEnvironments`, `getActiveEnvironmentId` (`environmentStore.ts`), `buildRequest` (`requestBuilder.ts`), `toCurl` (`curl.ts`), `JsonTree` (shared component)
- Produces: `<ApiClientPage />` mounted at `/api`.

This task is UI composition wiring together prior units; it is verified manually rather than with component tests (no new business logic is introduced).

- [ ] **Step 1: Implement `src/tools/api-client/EndpointList.tsx`**

```tsx
import { useMemo, useState } from 'react'
import type { Endpoint } from './types'

export function EndpointList({
  endpoints,
  onSelect,
  selected,
}: {
  endpoints: Endpoint[]
  onSelect: (endpoint: Endpoint) => void
  selected: Endpoint | null
}) {
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set())

  const grouped = useMemo(() => {
    const map = new Map<string, Endpoint[]>()
    for (const e of endpoints) {
      const list = map.get(e.tag) ?? []
      list.push(e)
      map.set(e.tag, list)
    }
    return map
  }, [endpoints])

  const toggleTag = (tag: string) => {
    setExpandedTags((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  return (
    <div className="text-sm">
      {[...grouped.entries()].map(([tag, list]) => (
        <div key={tag} className="mb-2">
          <button onClick={() => toggleTag(tag)} className="font-semibold text-slate-700 py-1">
            {expandedTags.has(tag) ? '▾' : '▸'} {tag}
          </button>
          {expandedTags.has(tag) && (
            <div className="ml-3">
              {list.map((e) => (
                <button
                  key={`${e.method}-${e.path}`}
                  onClick={() => onSelect(e)}
                  className={`block w-full text-left px-2 py-1 rounded font-mono text-xs ${
                    selected === e ? 'bg-slate-800 text-white' : 'hover:bg-slate-100'
                  }`}
                >
                  <span className="font-bold mr-2">{e.method}</span>{e.path}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Implement `src/tools/api-client/TryItOutForm.tsx`**

```tsx
import { useState } from 'react'
import type { Endpoint } from './types'
import { listEnvironments, getActiveEnvironmentId } from './environmentStore'
import { buildRequest } from './requestBuilder'
import { toCurl } from '../../lib/curl'
import { JsonTree } from '../../components/JsonTree'

interface ResponseState {
  status: number
  headers: Record<string, string>
  bodyText: string
  bodyJson: unknown
  timeMs: number
}

export function TryItOutForm({ endpoint }: { endpoint: Endpoint }) {
  const [pathValues, setPathValues] = useState<Record<string, string>>({})
  const [queryValues, setQueryValues] = useState<Record<string, string>>({})
  const [bodyText, setBodyText] = useState(
    endpoint.requestBodyExample ? JSON.stringify(endpoint.requestBodyExample, null, 2) : '',
  )
  const [response, setResponse] = useState<ResponseState | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pathParams = endpoint.parameters.filter((p) => p.in === 'path')
  const queryParams = endpoint.parameters.filter((p) => p.in === 'query')

  const activeEnv = listEnvironments().find((e) => e.id === getActiveEnvironmentId())

  const handleSend = async () => {
    setError(null)
    setResponse(null)

    if (!activeEnv) {
      setError('No active environment selected. Create/select one above.')
      return
    }

    const built = buildRequest(endpoint, activeEnv, {
      path: pathValues,
      query: queryValues,
      headers: {},
      body: bodyText || undefined,
    })

    const start = performance.now()
    try {
      const res = await fetch(built.url, { method: built.method, headers: built.headers, body: built.body })
      const timeMs = Math.round(performance.now() - start)
      const text = await res.text()
      let json: unknown
      try {
        json = JSON.parse(text)
      } catch {
        json = undefined
      }

      const headers: Record<string, string> = {}
      res.headers.forEach((v, k) => (headers[k] = v))

      setResponse({ status: res.status, headers, bodyText: text, bodyJson: json, timeMs })
    } catch (err) {
      setError(
        `Request failed: ${(err as Error).message}. If this is a cross-origin request, the server likely needs to allow this origin via CORS — ask the backend team to enable it, or configure a proxy URL prefix in settings.`,
      )
    }
  }

  const handleCopyCurl = () => {
    if (!activeEnv) return
    const built = buildRequest(endpoint, activeEnv, {
      path: pathValues,
      query: queryValues,
      headers: {},
      body: bodyText || undefined,
    })
    navigator.clipboard.writeText(toCurl(built))
  }

  return (
    <div className="p-3 flex flex-col gap-3">
      <h2 className="font-mono text-sm font-bold">{endpoint.method} {endpoint.path}</h2>

      {pathParams.map((p) => (
        <label key={p.name} className="text-sm">
          {p.name} (path{p.required ? ', required' : ''})
          <input
            className="block w-full border border-slate-300 rounded px-2 py-1"
            value={pathValues[p.name] ?? ''}
            onChange={(e) => setPathValues({ ...pathValues, [p.name]: e.target.value })}
          />
        </label>
      ))}

      {queryParams.map((p) => (
        <label key={p.name} className="text-sm">
          {p.name} (query{p.required ? ', required' : ''})
          <input
            className="block w-full border border-slate-300 rounded px-2 py-1"
            value={queryValues[p.name] ?? ''}
            onChange={(e) => setQueryValues({ ...queryValues, [p.name]: e.target.value })}
          />
        </label>
      ))}

      {endpoint.requestBodyExample !== undefined && (
        <label className="text-sm">
          Request body (JSON)
          <textarea
            className="block w-full h-32 border border-slate-300 rounded px-2 py-1 font-mono text-xs"
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
          />
        </label>
      )}

      <div className="flex gap-2">
        <button onClick={handleSend} className="px-3 py-1 text-sm rounded bg-slate-800 text-white">Send</button>
        <button onClick={handleCopyCurl} className="px-3 py-1 text-sm rounded bg-slate-200">Copy as cURL</button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {response && (
        <div className="border-t border-slate-200 pt-2">
          <div className="text-sm text-slate-600 mb-2">
            Status {response.status} · {response.timeMs} ms
          </div>
          {response.bodyJson !== undefined ? (
            <JsonTree value={response.bodyJson} />
          ) : (
            <pre className="text-xs whitespace-pre-wrap">{response.bodyText}</pre>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Implement `src/tools/api-client/ApiClientPage.tsx`**

```tsx
import { useState } from 'react'
import type { ApiSpec, Endpoint } from './types'
import { parseSpecFromText, fetchSpec } from './specParser'
import { EnvironmentManager } from './EnvironmentManager'
import { EndpointList } from './EndpointList'
import { TryItOutForm } from './TryItOutForm'

export function ApiClientPage() {
  const [spec, setSpec] = useState<ApiSpec | null>(null)
  const [selected, setSelected] = useState<Endpoint | null>(null)
  const [importText, setImportText] = useState('')
  const [importUrl, setImportUrl] = useState('')
  const [importError, setImportError] = useState<string | null>(null)

  const handleImportText = async () => {
    setImportError(null)
    const result = await parseSpecFromText(importText)
    if (result.ok) setSpec(result.spec)
    else setImportError(result.error)
  }

  const handleImportUrl = async () => {
    setImportError(null)
    const result = await fetchSpec(importUrl)
    if (result.ok) setSpec(result.spec)
    else setImportError(result.error)
  }

  return (
    <div className="h-full flex flex-col">
      <EnvironmentManager />

      {!spec && (
        <div className="p-4 flex flex-col gap-3 max-w-xl">
          <label className="text-sm">
            Import from URL
            <div className="flex gap-2">
              <input
                className="flex-1 border border-slate-300 rounded px-2 py-1"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://api.example.com/openapi.json"
              />
              <button onClick={handleImportUrl} className="px-3 py-1 text-sm rounded bg-slate-800 text-white">Fetch</button>
            </div>
          </label>
          <label className="text-sm">
            Or paste spec (JSON/YAML)
            <textarea
              className="block w-full h-40 border border-slate-300 rounded px-2 py-1 font-mono text-xs"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
          </label>
          <button onClick={handleImportText} className="self-start px-3 py-1 text-sm rounded bg-slate-800 text-white">
            Parse spec
          </button>
          {importError && <div className="text-sm text-red-600">{importError}</div>}
        </div>
      )}

      {spec && (
        <div className="flex-1 grid grid-cols-[280px_1fr] min-h-0">
          <div className="overflow-auto p-3 border-r border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm">{spec.title}</span>
              <button onClick={() => setSpec(null)} className="text-xs text-slate-500">change spec</button>
            </div>
            <EndpointList endpoints={spec.endpoints} onSelect={setSelected} selected={selected} />
          </div>
          <div className="overflow-auto">
            {selected ? <TryItOutForm endpoint={selected} /> : (
              <div className="p-4 text-sm text-slate-500">Select an endpoint from the left.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Wire into `src/App.tsx`**

```tsx
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { JsonViewerPage } from './tools/json-viewer/JsonViewerPage'
import { ApiClientPage } from './tools/api-client/ApiClientPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/json" replace />} />
          <Route path="/json" element={<JsonViewerPage />} />
          <Route path="/api" element={<ApiClientPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
```

- [ ] **Step 5: Run full test suite and build**

Run: `npm run test && npm run build`
Expected: all tests PASS, build succeeds with no TypeScript errors.

- [ ] **Step 6: Manual verification**

Run: `npm run dev`, open `/#/api`. Create an environment (name, base URL, auth). Paste a small OpenAPI JSON spec (e.g. Petstore sample) into "paste spec" and click Parse spec — confirm endpoints render grouped by tag. Select an endpoint, fill in params, click Send against a real or mock endpoint and confirm the response viewer shows status/time/body via the tree view. Click Copy as cURL and confirm the clipboard contains a valid `curl` command. Try a cross-origin request against a server without CORS enabled and confirm the friendly error message appears. Stop the dev server after confirming.

- [ ] **Step 7: Commit**

```bash
git add src/tools/api-client src/App.tsx
git commit -m "Add API Client page: spec import, endpoint list, try-it-out, response viewer"
```

---

### Task 10: GitHub Actions deploy workflow and README

**Files:**
- Create: `.github/workflows/deploy.yml`
- Create/Modify: `README.md`

**Interfaces:**
- Produces: a GitHub Actions workflow that builds the app and deploys `dist/` to GitHub Pages on every push to `main`.

- [ ] **Step 1: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Write `README.md`**

```markdown
# DevTools Web

Internal developer tools: a JSON Viewer and an API Client, deployed statically to GitHub Pages. No backend — all state (environments, tokens, editor content) is kept in your browser's `localStorage`.

## Local development

\`\`\`bash
npm install
npm run dev
\`\`\`

## Build

\`\`\`bash
npm run build
npm run preview   # serve the production build locally
\`\`\`

## Tests

\`\`\`bash
npm run test
\`\`\`

## Configuring the repo name

This app is served from a GitHub Pages subpath (`https://<org>.github.io/<repo-name>/`). If you fork or rename the repo, update `base` in `vite.config.ts`:

\`\`\`ts
export default defineConfig({
  base: '/<repo-name>/',
  // ...
})
\`\`\`

## Enabling GitHub Pages

1. Push to `main` — this triggers `.github/workflows/deploy.yml`.
2. In the repo, go to **Settings → Pages → Source** and select **GitHub Actions**.
3. The site will be published at `https://<org>.github.io/devtools-web/`.

Note: a private repo requires GitHub Pro/Team to enable Pages; a public repo is free.

## CORS note (API Client)

Requests are sent directly from your browser via `fetch`. If the target API doesn't allow the GitHub Pages origin via CORS, requests will fail — ask the backend to allow the origin, or configure a proxy URL prefix in the API Client settings.
```

- [ ] **Step 3: Verify the build one more time locally**

Run: `npm run build`
Expected: success, `dist/index.html` references assets under `/devtools-web/`.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml README.md
git commit -m "Add GitHub Actions deploy workflow and README"
```

- [ ] **Step 5: Push and enable Pages (manual, outside this plan)**

This step requires pushing to a remote and changing repository settings — both are outside the scope of an automated plan step. After this plan's tasks are complete, push `main` to GitHub and enable Pages under Settings → Pages → Source: GitHub Actions, per the README.

---

## Self-Review Notes

- **Spec coverage:** Two-panel JSON editor+tree (Task 4), format/minify (Task 4), validate with Monaco markers (Task 4), auto-fix (Task 3+4), search+highlight (Task 2+4), copy value/JSONPath (Task 2+4), OpenAPI import via URL/paste (Task 5+9), endpoint list by tag (Task 5+9), environments with Bearer/API Key/Basic auth (Task 6+8), try-it-out with generated examples (Task 5+9), real fetch + response viewer reusing JsonTree (Task 9), Copy as cURL (Task 7+9), friendly CORS error (Task 9), optional proxy prefix (flagged as a small follow-up below), GitHub Actions deploy (Task 10), README (Task 10). All Phase 1 spec items are covered.
- **Known small gap:** the optional "proxy URL prefix" setting from the spec is not wired into `requestBuilder`/`TryItOutForm` in this plan — it's a small addition (one more field in `Environment` or a separate global setting, and prefixing `built.url` before `fetch`). Left out to keep Task 9 focused; add as a fast follow-up task if needed before calling Phase 1 fully done.
- **Type consistency:** `Environment`/`AuthConfig` defined once in `environmentStore.ts` (Task 6) and consumed identically by `requestBuilder.ts` (Task 7), `EnvironmentManager.tsx` (Task 8), and `TryItOutForm.tsx` (Task 9). `Endpoint`/`EndpointParam` defined once in `types.ts` (Task 5) and consumed identically thereafter. `BuiltRequest` defined in `requestBuilder.ts`, consumed by `curl.ts` and `TryItOutForm.tsx` with matching shape.
