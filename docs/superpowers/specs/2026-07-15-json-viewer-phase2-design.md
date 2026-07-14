# JSON Viewer Phase 2 — Design Spec

Date: 2026-07-15

## Goal

Complete the JSON Viewer tool (the `json4u.com`-inspired tool from the original spec) with its remaining Phase 2 features: Compare/Diff, Escape/Unescape, Convert (YAML/TypeScript), and JSONPath query. The API Client tool is explicitly out of scope for this cycle — it will get its own fix-up spec later.

## Scope

In scope (all four, per user decision):
1. Compare/Diff two JSON documents
2. Escape/Unescape a JSON string embedded inside JSON
3. Convert JSON → YAML and JSON → TypeScript interface
4. JSONPath query to filter/select data

Out of scope: CSV/Go struct convert (optional in the original spec, deferred), any API Client changes, file-size/virtualization work (Phase 3), graph view (Phase 3).

## UI Structure

`JsonViewerPage` gains a small sub-tab bar: **Editor** (existing Format/Minify/Auto-fix/Search/tree view, unchanged) and **Compare** (new). The existing toolbar on the Editor tab gains three more controls:
- **Unescape** / **Escape** buttons — transform the editor content in place.
- **Convert ▾** dropdown (YAML / TypeScript) — opens a modal with the converted output and a Copy button.
- **JSONPath** toggle button — shows/hides a query panel between the toolbar and the editor/tree columns. This is intentionally separate from the existing key/value Search box (different purpose: Search highlights within the current tree, JSONPath query selects and lists matching values by path).

## Feature Designs

### 1. Compare/Diff

- **Compare** tab: two Monaco JSON editors side by side (left/right), each with their own localStorage-persisted content (new keys, e.g. `devtools:json-viewer:compare-left` / `-right`).
- Diff is computed with `jsondiffpatch`'s `diff(left, right)` producing a delta object.
- Rather than use `jsondiffpatch`'s bundled HTML/CSS formatters (which wouldn't match the app's Tailwind styling), a custom `DiffTree` component walks the merged left/right structure together with the delta and renders each node with a status: unchanged (default), added (green), removed (red, strikethrough), modified (yellow, shows old → new value).
- `src/tools/json-viewer/diff.ts`: pure function `computeDiffTree(left: unknown, right: unknown): DiffNode` — recursively merges the two values and the `jsondiffpatch` delta into a single annotated tree structure (`DiffNode = { status: 'unchanged'|'added'|'removed'|'modified'; key: string|number; value?: unknown; oldValue?: unknown; children?: DiffNode[] }`).
- `src/tools/json-viewer/DiffTree.tsx`: renders a `DiffNode` tree (collapsible like `JsonTree`, color-coded by status).
- `src/tools/json-viewer/CompareView.tsx`: two editors + `DiffTree` result panel, recomputes on change (debounced or on-blur — implementation task decides based on `jsondiffpatch` performance for typical payload sizes).
- Invalid JSON on either side: show a validation message in place of the diff (reuse `parseJsonStrict` from Phase 1), no partial diff attempted.

### 2. Escape/Unescape

- `src/lib/jsonEscape.ts`:
  - `escapeJsonString(text: string): string` — returns `JSON.stringify(text)` (wraps the raw editor text as a JSON string literal, escaping quotes/backslashes/newlines).
  - `unescapeJsonString(text: string): { ok: true; result: string } | { ok: false; error: string }` — attempts `JSON.parse(text)`; if the parsed value is a `string`, returns it (which may itself be re-formatted JSON — the caller re-runs it through `parseJsonStrict`/format if it parses as JSON, otherwise displays as plain text); if parsing fails or the parsed value isn't a string, returns an error explaining the content isn't a JSON-escaped string.
- Both buttons operate on the Editor tab's current content in place (replacing it, so Monaco's native undo/redo covers reverting).

### 3. Convert

- `src/lib/jsonConvert.ts`:
  - `toYaml(value: unknown): string` — `js-yaml`'s `dump(value)` (already a dependency from the API Client's `specParser.ts`).
  - `toTypeScriptInterface(value: unknown, rootName?: string): string` — walks the JSON value and generates TypeScript `interface` declarations: objects become named interfaces (default root name `Root`, nested object properties named by capitalizing the property path, e.g. `RootAddress` for `root.address`), arrays become `T[]` (using the element type, or `unknown[]` for empty arrays), primitives map to `string`/`number`/`boolean`/`null`. Mixed-type arrays produce a union type.
- `src/tools/json-viewer/ConvertModal.tsx`: dropdown button "Convert ▾" with "To YAML"/"To TypeScript" options; selecting one runs the current Editor tab's parsed JSON through the corresponding function and shows the result in a modal with a Copy button. If the editor content doesn't currently parse (per `parseJsonStrict`), the Convert options are disabled.

### 4. JSONPath query

- New dependency: `jsonpath-plus` (standards-compliant JSONPath evaluation, avoids reimplementing path syntax/edge cases).
- `src/lib/jsonPathQuery.ts`: `queryJsonPath(value: unknown, path: string): { ok: true; results: { path: string; value: unknown }[] } | { ok: false; error: string }` — wraps `JSONPath({ path, json: value, resultType: 'all' })`, mapping results to `{path, value}` pairs; catches and surfaces `jsonpath-plus` syntax errors as `{ok:false, error}`.
- `src/tools/json-viewer/JsonPathPanel.tsx`: shown when the JSONPath toolbar toggle is active, between the toolbar and the editor/tree columns. Contains a text input (submit on Enter) and a results list below it — each result shows its resolved path (e.g. `$.a.b[0]`) and renders its value via the existing `JsonTree` component. Empty results or a query error show an inline message.

## File Structure (additions to `src/tools/json-viewer/` and `src/lib/`)

```
src/lib/
  jsonEscape.ts           (+ jsonEscape.test.ts)
  jsonConvert.ts           (+ jsonConvert.test.ts)
  jsonPathQuery.ts         (+ jsonPathQuery.test.ts)
src/tools/json-viewer/
  diff.ts                  (+ diff.test.ts)
  DiffTree.tsx              (+ DiffTree.test.tsx)
  CompareView.tsx
  ConvertModal.tsx
  JsonPathPanel.tsx
  JsonViewerPage.tsx        (modified: sub-tabs, new toolbar buttons, mounts CompareView/ConvertModal/JsonPathPanel)
```

## Testing Approach

Pure logic modules (`diff.ts`, `jsonEscape.ts`, `jsonConvert.ts`, `jsonPathQuery.ts`) get unit tests covering their documented behavior and edge cases (empty objects/arrays, type mismatches, invalid JSONPath syntax, non-string unescape targets). UI composition components (`CompareView`, `ConvertModal`, `JsonPathPanel`, the modified `JsonViewerPage`) are verified manually in a running dev server, consistent with how Phase 1's `ApiClientPage` was handled — no new component-level UI tests unless a component contains real logic beyond wiring (e.g. `DiffTree`'s status-based rendering gets a component test since it has real branching logic, same treatment as `JsonTree` in Phase 1).

## Global Constraints (carried over from Phase 1)

- TypeScript strict mode project-wide.
- No secrets/tokens hardcoded (not applicable here, no auth surface).
- Component boundaries: new files live in `src/lib/` (pure logic) and `src/tools/json-viewer/` (UI), consistent with Phase 1.
- No changes to `src/tools/api-client/` in this cycle.
