import type { ApiSpec, Endpoint } from '../tools/api-client/types'
import { computeDiffTree, type DiffNode } from '../tools/json-viewer/diff'

export type ChangeKind = 'added' | 'removed' | 'modified'

export interface EndpointChange {
  kind: ChangeKind
  method: string
  path: string
  /** Human-readable modification lines (only for kind 'modified'). */
  details: string[]
}

export interface ModelChange {
  kind: ChangeKind
  name: string
  /** Deep schema diff (only for kind 'modified'). */
  diff?: DiffNode
}

export interface ApiSpecDiff {
  endpoints: EndpointChange[]
  models: ModelChange[]
}

function endpointKey(e: Endpoint): string {
  return `${e.method} ${e.path}`
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

function describeParamSchema(p: { schema?: Record<string, unknown> }): string {
  const t = p.schema?.type
  return typeof t === 'string' ? t : 'unknown'
}

function diffEndpoint(left: Endpoint, right: Endpoint): string[] {
  const details: string[] = []

  if ((left.summary ?? '') !== (right.summary ?? '')) details.push('summary changed')
  if (Boolean(left.deprecated) !== Boolean(right.deprecated)) {
    details.push(right.deprecated ? 'marked deprecated' : 'no longer deprecated')
  }

  const leftParams = new Map(left.parameters.map((p) => [`${p.in}:${p.name}`, p]))
  const rightParams = new Map(right.parameters.map((p) => [`${p.in}:${p.name}`, p]))
  for (const [key, rp] of rightParams) {
    const lp = leftParams.get(key)
    if (!lp) {
      details.push(`param '${rp.name}' added (${rp.in}, ${describeParamSchema(rp)})`)
    } else {
      if (!same(lp.schema, rp.schema)) details.push(`param '${rp.name}' type changed (${describeParamSchema(lp)} → ${describeParamSchema(rp)})`)
      if (lp.required !== rp.required) details.push(`param '${rp.name}' ${rp.required ? 'now required' : 'no longer required'}`)
    }
  }
  for (const [key, lp] of leftParams) {
    if (!rightParams.has(key)) details.push(`param '${lp.name}' removed (${lp.in})`)
  }

  if (!same(left.requestBodySchema, right.requestBodySchema)) details.push('request body schema changed')

  const leftRes = new Map((left.responses ?? []).map((r) => [r.status, r]))
  const rightRes = new Map((right.responses ?? []).map((r) => [r.status, r]))
  for (const [status, rr] of rightRes) {
    const lr = leftRes.get(status)
    if (!lr) details.push(`response ${status} added`)
    else if (!same(lr.schema, rr.schema)) details.push(`response ${status} schema changed`)
  }
  for (const status of leftRes.keys()) {
    if (!rightRes.has(status)) details.push(`response ${status} removed`)
  }

  return details
}

export function diffApiSpecs(left: ApiSpec, right: ApiSpec): ApiSpecDiff {
  const endpoints: EndpointChange[] = []
  const leftEps = new Map(left.endpoints.map((e) => [endpointKey(e), e]))
  const rightEps = new Map(right.endpoints.map((e) => [endpointKey(e), e]))

  for (const [key, re] of rightEps) {
    const le = leftEps.get(key)
    if (!le) {
      endpoints.push({ kind: 'added', method: re.method, path: re.path, details: [] })
    } else {
      const details = diffEndpoint(le, re)
      if (details.length > 0) endpoints.push({ kind: 'modified', method: re.method, path: re.path, details })
    }
  }
  for (const [key, le] of leftEps) {
    if (!rightEps.has(key)) endpoints.push({ kind: 'removed', method: le.method, path: le.path, details: [] })
  }

  const models: ModelChange[] = []
  const leftModels = new Map((left.models ?? []).map((m) => [m.name, m]))
  const rightModels = new Map((right.models ?? []).map((m) => [m.name, m]))

  for (const [name, rm] of rightModels) {
    const lm = leftModels.get(name)
    if (!lm) {
      models.push({ kind: 'added', name })
    } else if (!same(lm.schema, rm.schema)) {
      models.push({ kind: 'modified', name, diff: computeDiffTree(lm.schema, rm.schema) })
    }
  }
  for (const name of leftModels.keys()) {
    if (!rightModels.has(name)) models.push({ kind: 'removed', name })
  }

  const kindOrder: Record<ChangeKind, number> = { added: 0, removed: 1, modified: 2 }
  endpoints.sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind] || a.path.localeCompare(b.path))
  models.sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind] || a.name.localeCompare(b.name))

  return { endpoints, models }
}
