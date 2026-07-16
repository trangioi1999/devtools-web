# JSON Viewer Redesign — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the JSON Viewer's Editor tab so it has multiple preview modes (Tree-as-graph, Table, Text, Chart), a compact icon toolbar, a shared search bar with match count, and copy-action feedback — closing the gap with json4u.app while keeping the existing Compare/Escape/Convert/JSONPath features.

## Background

Phase 1 (API Client) and Phase 2 (Compare/Escape/Convert/JSONPath) are complete. User feedback on the current JSON Viewer:
- Toolbar is 8 text buttons in a row, ungrouped, no icons.
- Only one preview mode exists: a collapsed text tree (`JsonTree.tsx`).
- No table view for arrays of objects.
- Actions (copy, search) give no feedback (no toast, no match count).

Reference screenshots of json4u.app/editor were captured live (2026-07-16) and used to ground this design: its right panel has 3 view-mode icons (list / node-graph / table), the node-graph uses connected cards (one per object/array) laid out left-to-right, and the table view renders nested array/object cells as an **inline sub-table within the cell** rather than a collapsed badge.

## Architecture

Keep the existing two top-level tabs, **Editor** and **Compare** — Compare needs two side-by-side editors, which doesn't fit a "one editor + preview" layout, so it stays a separate tab unchanged.

**Editor tab** becomes: Monaco editor (left, unchanged) + a **Preview panel** (right) with 4 view modes switched via icon tabs: **Tree / Table / Text / Chart**.

The toolbar above the editor changes from 8 text buttons to a grouped **icon toolbar** with tooltips:

```
[Format] [Minify] [Auto-fix]  |  [Escape] [Unescape]  |  [Convert▾]  |  [JSONPath]
```

The Preview panel gets its own header:

```
[Tree] [Table] [Text] [Chart]  .....  [ Search JSON.......... ]  3 matches
```

Search is a single shared input; results highlight in whichever view is active and show a live match count.

A lightweight **toast** notification (bottom of screen, auto-dismiss) confirms copy actions (copy path / copy value / copy converted output) — currently these actions give no feedback at all.

## View modes

### Tree (graph)

Replaces the collapsed text tree as the primary Tree preview. Built with `reactflow` (`@xyflow/react`) + `dagre` for auto-layout (left-to-right rank direction).

- Each JSON object/array becomes one **node** ("card") listing its immediate keys.
- A primitive key renders inline as `key: value` inside the card.
- An object/array key renders as `key: {n}` / `key: [n]` (badge) with an **edge** connecting to the child node's card.
- Pan/zoom/fit-to-view come from React Flow's built-in controls.
- Clicking a nested badge pans/zooms the camera to focus the connected child node.
- **Performance guard:** if the flattened node count exceeds ~300, rendering caps at a shallower depth and shows a banner suggesting the Table view instead, to avoid freezing the browser on large payloads (a concern json4u doesn't need to solve as aggressively for this internal tool's use cases).

### Table

- **Array of objects** (root or any nested array): columns = union of keys across all objects, one row per object.
- **Single object**: 2-column key/value table.
- **Array of primitives**: 2-column index/value table.
- **Nested cell** (array or object value inside a cell): renders an **inline sub-table directly in the cell** (index/key + value stacked vertically), recursively, matching json4u's behavior — not a collapsed badge requiring a click.

### Text

Read-only, syntax-highlighted, pretty-printed rendering (Monaco in readonly mode), independent of the editable editor on the left — useful for browsing without risk of accidental edits.

### Chart

Enabled only when the current value is an array of objects with at least one numeric field.

- Default: first string-like field → X axis, first numeric field → Y axis, chart type Bar.
- Two dropdowns (X field, Y field) and a chart-type toggle (Bar/Line) let the user change the mapping.
- Built with `recharts`. Follow the `dataviz` skill's palette/mark guidance when implementing.

## New dependencies

- `reactflow` (`@xyflow/react`) + `dagre` — Tree/graph layout.
- `recharts` — Chart view.
- No new dependency for Table, Text, or Toast — implemented directly.

## File structure

Following the existing pattern (pure logic in `src/lib/`, UI composition in `src/tools/json-viewer/`):

```
src/lib/
  jsonGraphLayout.ts   (+ test)  — JSON value → { nodes, edges } for React Flow
  jsonTableRows.ts     (+ test)  — JSON value → { columns, rows } for Table
  jsonChartData.ts     (+ test)  — array-of-objects → chart-ready series data
src/tools/json-viewer/
  GraphView.tsx, GraphNode.tsx   — React Flow wrapper + custom node card
  TableView.tsx                  — recursive table (nested cell = inline sub-table)
  TextView.tsx                   — Monaco readonly mirror
  ChartView.tsx                  — Recharts wrapper + axis dropdowns
  IconToolbar.tsx                — replaces the current 8-button toolbar
  Toast.tsx, useToast.ts         — copy-action confirmation
  JsonViewerPage.tsx (modified)  — wires preview-panel header, shared search+count, toast
```

`JsonTree.tsx` (existing) is **kept as-is** — it's still used by `JsonPathPanel` to render individual query-result values (a small, separate use case that doesn't need the graph treatment).

## Testing

Consistent with Phase 1/2 convention: pure logic modules (`jsonGraphLayout`, `jsonTableRows`, `jsonChartData`) get unit tests. UI composition components (`GraphView`, `TableView`, `TextView`, `ChartView`, `IconToolbar`, `Toast`, `JsonViewerPage` wiring) are verified manually via Playwright, matching how Phase 1/2 UI wiring was verified.

## Self-Review Notes

- **Placeholder scan:** none — every section specifies concrete behavior.
- **Internal consistency:** Tree/Table/Text/Chart view responsibilities don't overlap; Compare stays untouched; `JsonTree.tsx` usage boundary (JsonPathPanel only) is explicit so there's no ambiguity about what replaces what.
- **Scope check:** single cohesive feature (Editor tab preview redesign) — appropriately sized for one implementation plan.
- **Ambiguity check:** nested-cell rendering in Table (inline sub-table, not collapse+click) was explicitly confirmed against a live json4u reference screenshot to remove ambiguity.
