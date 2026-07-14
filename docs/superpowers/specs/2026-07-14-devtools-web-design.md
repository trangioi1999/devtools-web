# DevTools Web App — Design Spec

Date: 2026-07-14
Repo: `devtools-web` (public, GitHub Pages)

## Goal

Internal (~10 users) static web app bundling two developer tools:

1. **JSON Viewer** — inspired by json4u.com
2. **API Client** — Swagger-UI-like, but with flexible domain/token configuration per environment

Deployed statically to GitHub Pages via GitHub Actions. No backend, no server-side storage — everything the user enters lives in `localStorage`.

## Tech Stack

| Layer | Choice |
|---|---|
| Build | Vite |
| Framework | React 18 + TypeScript (strict mode) |
| Styling | Tailwind CSS |
| Routing | React Router `HashRouter` (`/#/json`, `/#/api`) — GitHub Pages has no SPA history fallback |
| JSON Editor | Monaco Editor (`@monaco-editor/react`) |
| Swagger render | `swagger-ui-react`, or custom render if more UI control is needed |
| Soft JSON parsing (auto-fix) | `jsonc-parser` or `json5` |
| State/persistence | `localStorage` only |

`vite.config.ts` sets `base: '/devtools-web/'` so assets resolve correctly under the GitHub Pages subpath.

Phase 2 additions to the stack (not built in this cycle): `jsondiffpatch` for JSON diff.

## Project Structure

```
src/
  tools/
    json-viewer/       # Tool 1 — Monaco + tree view + validation + autofix + search
    api-client/         # Tool 2 — spec import + environments + try-it-out
  components/            # shared, e.g. the JSON tree view (reused by API Client's response viewer)
```

## Layout & Routing

- Shared top nav/sidebar to switch between the two tools.
- `/#/json` → JSON Viewer, `/#/api` → API Client.
- Each tool persists its own state to `localStorage` so a reload doesn't lose data.
- Dark mode is a nice-to-have, not required for Phase 1.

## Scope for This Implementation Cycle

Only **Phase 1** of both tools, plus deploy automation. Phase 2/3 features (diff, convert, JSONPath query, history replay, virtualized rendering, graph view) are deliberately excluded here and will get their own spec once Phase 1 is validated in daily use.

### JSON Viewer — Phase 1

- Two-panel layout: left = Monaco editor for raw JSON input; right = collapsible/expandable tree view.
- **Format** (2-space pretty print) and **Minify**.
- **Validate**: errors reported with precise line/column via Monaco markers.
- **Auto-fix**: soft-parse minor errors (trailing comma, missing comma, single quotes, unquoted keys) using `jsonc-parser`/`json5`, then re-serialize as strict JSON.
- **Search**: search key/value in the tree, highlight matches, scroll to result.
- **Copy**: click a tree node to copy its value or its JSONPath (e.g. `a.b[0].c`).

### API Client — Phase 1

**Spec import**
- Import an OpenAPI/Swagger spec via URL or by pasting JSON/YAML directly.
- Render endpoints grouped by tag, expandable to show params, request body schema, response schema.

**Environments & Auth** (the key differentiator vs. plain Swagger UI)
- Manage multiple named environments (e.g. dev/staging/prod), each with:
  - Name
  - Base URL (overrides the spec's server URL)
  - Auth: Bearer token, API Key (configurable header name or query param), or Basic Auth
- Header dropdown to select the active environment; applies to every request.
- All environment config persisted to `localStorage`.

**Try it out**
- Form for path params, query params, headers, request body, with examples auto-generated from schema.
- Sends real requests via `fetch`, auto-attaching base URL + auth from the active environment.
- Response viewer: status code, headers, body, response time (ms).
- JSON response bodies render using the same tree-view component as the JSON Viewer tool.
- **Copy as cURL** button.

**CORS handling**
- No proxy is built into this repo (GitHub Pages is static-only).
- On CORS failure, show a friendly explanation plus suggestions (ask backend to allow the GitHub Pages origin, or use an external proxy like Cloudflare Workers).
- Optional setting: a "proxy URL prefix" — if set, requests are routed as `<proxyUrl>/<targetUrl>`.

## Deploy

`.github/workflows/deploy.yml`:
- Trigger: push to `main`.
- Steps: checkout → setup Node 20 → `npm ci` → `npm run build` → deploy `dist/` via `actions/upload-pages-artifact` + `actions/deploy-pages`.
- README documents: local dev/build commands, how to change the repo name in `vite.config.ts`, and enabling Pages under Settings → Pages → Source: GitHub Actions (public repo, so no GitHub Pro/Team requirement).

## Quality Bar

- TypeScript strict mode throughout.
- Clear component boundaries: `src/tools/json-viewer/`, `src/tools/api-client/`, `src/components/` (shared).
- No hardcoded secrets/tokens — all user-entered credentials live in `localStorage` only.
- Basic responsiveness; desktop is the primary target, mobile polish is not required.

## Out of Scope (this cycle)

Everything under "Phase 2" and "Phase 3" in the original spec: JSON compare/diff, escape/unescape, JSON→YAML/TS conversion, JSONPath query, virtualized rendering for large files, graph view, request history/replay, `{{var}}` templating, multi-spec management.

## Implementation Order

1. Scaffold project (Vite + React + TS + Tailwind + HashRouter) + shared layout.
2. JSON Viewer Phase 1.
3. API Client Phase 1.
4. GitHub Actions workflow + verify deploy.
