# API Client Redesign Plan — Swagger-style UI, YAML Compare, Code Export

Date: 2026-07-17
Status: PLANNED (not implemented yet — implement in a follow-up session)
Branch: `claude/json-viewer-improvements-x4cnip`

## Context (current state)

`src/tools/api-client/` today is a minimal client:

- `types.ts` — `ApiSpec { title, endpoints: Endpoint[] }`, `Endpoint { method, path, tag, summary, parameters, requestBodyExample, responseExample }`.
- `specParser.ts` (83 lines) — parses an OpenAPI YAML/JSON spec into `ApiSpec`. Does NOT keep schemas/models, descriptions, response codes — only examples.
- `ApiClientPage.tsx` (80 lines) — paste spec → flat `EndpointList` → `TryItOutForm`.
- `EnvironmentManager` + `environmentStore` — environments with base URL + auth (keep as-is).
- `requestBuilder.ts` — builds fetch request from endpoint + env + values (keep as-is).

All three features below need the parser to retain much more of the OpenAPI document, so **step 0 is a parser upgrade** shared by everything else.

---

## Step 0 — Parser upgrade (foundation, do first)

Extend `specParser.ts` (or new `lib/openapiParser.ts`) to keep:

- `info` (title, version, description), `servers`.
- Per-operation: `operationId`, `description`, `deprecated`, request body schema
  (+ content type), all responses (status → schema + description), parameter
  schemas (type/format/enum/default), security.
- `components.schemas` fully, with `$ref` resolution helper
  (`resolveRef(spec, '#/components/schemas/X')`) — do NOT inline/duplicate;
  keep refs so Compare can diff model-by-model.

New types (extend `types.ts`):

```ts
interface ApiModel { name: string; schema: JsonSchemaLike }
interface ApiSpecFull extends ApiSpec {
  version?: string
  description?: string
  servers: string[]
  models: ApiModel[]           // from components.schemas
  raw: unknown                 // parsed YAML doc for compare/export
}
interface Endpoint {           // additions
  operationId?: string
  description?: string
  deprecated?: boolean
  requestBodySchema?: JsonSchemaLike
  responses: { status: string; description?: string; schema?: JsonSchemaLike }[]
}
```

Tests: parse a fixture spec with $refs, nested schemas, multiple responses.

---

## Feature 1 — Swagger-style UI

Replace the flat list with a Swagger-UI-like layout users already know.

### Layout

- Header: spec title, version badge, description (markdown-ish plain text ok),
  servers dropdown (merges with Environment base URL — env wins when active).
- **Group endpoints by tag** into collapsible sections (like Swagger's tag
  groups). Section header: tag name + endpoint count.
- Each endpoint = a collapsible row:
  - Colored method chip (GET green `#61affe`-style blue, POST green, PUT
    orange, DELETE red, PATCH teal — use Tailwind equivalents), path in
    mono, summary text right side, deprecated struck through.
  - Expanded body (accordion, one open at a time is fine):
    - Parameters table: name / in / type / required / description, with
      editable value inputs (reuse TryItOutForm logic).
    - Request body: schema view + editable JSON example (Monaco small).
    - Responses: status code tabs (200/400/…) with schema + example.
    - **Try it out** button → executes via existing `requestBuilder`,
      shows status, time, response body (pretty JSON with the existing
      `valueClassName` coloring or Monaco read-only).
- **Schemas/Models section** at the bottom (like Swagger): collapsible list
  of `components.schemas`, each expandable to a property table
  (name / type / required / description). Reuse JSON tree row styling.
- Search box filtering by path/operationId/tag (client-side).

### Files

- Rewrite `ApiClientPage.tsx` → layout shell + state (selected spec text,
  parsed spec, search, expanded ids).
- New: `TagSection.tsx`, `EndpointRow.tsx` (accordion row + try-it-out),
  `SchemaTable.tsx` (recursive property table), `ModelsSection.tsx`.
- Keep `EnvironmentManager`, `requestBuilder`, `environmentStore` unchanged.
- Persist pasted spec in localStorage (`devtools:api-client:spec`).

---

## Feature 2 — Compare 2 YAML specs

New sub-tab "Compare" inside API Client (mirror JSON viewer's Editor/Compare
tabs pattern — reuse `SplitPane`).

### UX

- Two Monaco editors (yaml language) side by side (SplitPane horizontal),
  persisted to localStorage; result panel below (SplitPane vertical).
- Result = **semantic API diff**, not text diff, two sections:

**Endpoints changed**
- Added / Removed operations (method + path), rendered green/red rows.
- Modified operations: parameter added/removed/type changed, request body
  schema changed, response codes added/removed, summary/deprecated changed.
  Each modification is one line: `~ GET /loan-info — param 'status' added (query, string)`.

**Models changed**
- Added / Removed schemas in `components.schemas`.
- Modified schemas: property added/removed, type changed, required flag
  changed, enum values changed. Show as expandable tree reusing
  `DiffTree`/`computeDiffTree` from the JSON viewer (diff the two schema
  objects directly — they are plain JSON after YAML parse), with the same
  "Only differences" default.

### Implementation

- `lib/apiSpecDiff.ts`: `diffApiSpecs(left: ApiSpecFull, right: ApiSpecFull): ApiSpecDiff`
  - Key endpoints by `method + path`.
  - Key models by schema name.
  - For deep model diff reuse `computeDiffTree` (it already handles
    arrays/objects/hasChanges).
- `CompareSpecsView.tsx` — editors + result panel + counts badges
  (`+n endpoints / −n / ~n`, same for models).
- Tests: fixture pair with added endpoint, changed param type, changed model
  property, removed response code.

---

## Feature 3 — Export actions (models + createEndpoints)

Toolbar "Export" dropdown on the API Client page (enabled when spec parses):

### 3a. Export TypeScript models from YAML schemas

- Reuse the JSON viewer's naming convention machinery (`jsonConvert.ts`):
  `I` prefix, optional `BE` suffix, `export interface`.
- New `lib/openapiToTs.ts`: convert each `components.schemas` entry from
  JSON-Schema (not example JSON!) to TS:
  - `type: string/number/integer/boolean` → primitives; `format: date-time`
    stays `string` (comment `/** ISO date-time */` optional).
  - `enum` → union of literals.
  - `required` array → non-required props get `?`.
  - `$ref` → referenced interface name (same naming convention).
  - `array` → `T[]`; `additionalProperties` → `Record<string, T>`.
  - Schema `description` → JSDoc comment `/** ... */` above the property
    (this gives the commented style from the team's example).
- Modal preview + Copy (reuse `ConvertModal` pattern with the same
  Root-name/prefix/suffix controls where sensible).

### 3b. Export `createEndpoints(basePath)`

Generate the team's endpoint-factory pattern from the spec paths:

```ts
function createEndpoints(basePath: string) {
  return {
    // GET
    getLoanInfo: `${basePath}/loan-info`,
    getLoanInfoById: (loanId: string) => `${basePath}/loan-info/${loanId}`,
    // POST
    postLoanInfoSearch: `${basePath}/loan-info/search`,
    // PUT
    putLoanInfo: (loanId: string) => `${basePath}/loan-info/${loanId}`,
    // DELETE
    deleteLoanInfo: (loanId: string) => `${basePath}/loan-info/${loanId}`,
  } as const;
}
```

Rules (new `lib/openapiToEndpoints.ts`):

- Group output by method with `// GET` / `// POST` / `// PUT` / `// DELETE`
  comment separators, in that order.
- **Key naming**: `method + PascalCase(path segments minus params)`;
  a trailing `{id}` param → `...ById` style: use `By + PascalCase(paramName)`
  when the param is not the last meaningful segment's obvious id, else `ById`.
  Concretely: camelCase(`get` + segments) → `getLoanInfo`,
  `/loan-info/{loanId}` → `getLoanInfoById` (param name ends with Id) —
  otherwise append `By<ParamName>` (e.g. `/loan-info/transaction/{transactionId}`
  → `getLoanInfoByTransaction`... derive from segment before param).
  Prefer `operationId` (camelCased) when present — it's the author's intent;
  fall back to path-derived name. De-dupe collisions with numeric suffix.
- **Value**: no path params → template string
  `` `${basePath}/loan-info` ``; with params → arrow fn, one arg per param
  (`(loanId: string) =>`), params substituted `${loanId}`.
- Multi-param paths: `(aId: string, bId: string) => ...` in path order.
- Wrap in `function createEndpoints(basePath: string) { return { ... } as const; }`.
- Editable prefix for key names? Not in v1 — keep output copy-paste simple.
- Tests: the loan-info example above should round-trip nearly exactly.

---

## Suggested implementation order (per session)

1. **Session A**: Step 0 parser + Feature 3 (both exports) — pure lib work +
   one modal, highest value/effort ratio, heavy unit-testable.
2. **Session B**: Feature 1 Swagger UI (big UI rewrite).
3. **Session C**: Feature 2 YAML compare (reuses DiffTree + SplitPane).

Each session: implement → `npm test` → `npm run build` → browser-verify with
Playwright → commit → PR → squash-merge → GitHub Pages deploy (auto on main).

## Open questions (defaults chosen, flag if wrong)

- Naming for endpoint keys prefers `operationId` when the spec has it;
  otherwise derived from path. (Default: yes.)
- Model export from YAML uses JSON-Schema types + JSDoc from `description`,
  `I` prefix on, `BE` suffix off by default. (Same defaults as JSON viewer.)
- Swagger UI accordion: one endpoint expanded at a time. (Default: yes.)
