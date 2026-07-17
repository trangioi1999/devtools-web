import type { Endpoint } from '../tools/api-client/types'

const METHOD_ORDER = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

function pascal(seg: string): string {
  return seg
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('')
}

function camel(name: string): string {
  const p = pascal(name)
  return p.charAt(0).toLowerCase() + p.slice(1)
}

/** 'loanId' -> 'loan', 'transaction_id' -> 'transaction', 'id' -> ''. */
function stripIdSuffix(param: string): string {
  return param.replace(/[_-]?[iI][dD]$/, '')
}

interface PathSeg {
  raw: string
  param: string | null // param name when segment is '{x}'
}

function parseSegments(path: string): PathSeg[] {
  return path
    .split('/')
    .filter(Boolean)
    .map((raw) => {
      const m = raw.match(/^\{(.+)\}$/)
      return { raw, param: m ? m[1] : null }
    })
}

/**
 * Derive the endpoint key from method + path, matching the team's factory
 * naming: static segments join into the base name; a path param becomes a
 * `By...` marker — `ById` when the param is the id of the resource itself
 * (`/loan-info/{loanId}`), otherwise `By<Stem>`, absorbing a preceding static
 * segment that matches the param stem (`/loan-info/transaction/{transactionId}`
 * -> getLoanInfoByTransaction).
 */
function deriveKey(method: string, path: string): string {
  const segments = parseSegments(path)
  const parts: string[] = []

  for (const seg of segments) {
    if (seg.param === null) {
      parts.push(pascal(seg.raw))
      continue
    }
    const stem = stripIdSuffix(seg.param)
    const prev = parts[parts.length - 1]
    if (stem && prev && pascal(stem) === prev) {
      // '/transaction/{transactionId}' — the static segment already names it
      parts[parts.length - 1] = `By${pascal(stem)}`
    } else if (!stem || (parts[0] && parts[0].toLowerCase().startsWith(stem.toLowerCase()))) {
      // '{id}' or '/loan-info/{loanId}' — param is the resource's own id
      parts.push('ById')
    } else {
      parts.push(`By${pascal(stem)}`)
    }
  }

  return camel(`${method.toLowerCase()}${parts.join('')}`)
}

function renderValue(path: string): string {
  const segments = parseSegments(path)
  const params = segments.filter((s) => s.param !== null).map((s) => s.param as string)
  const template = '${basePath}' + segments.map((s) => `/${s.param ? `\${${camel(s.param)}}` : s.raw}`).join('')

  if (params.length === 0) return `\`${template}\``
  const args = params.map((p) => `${camel(p)}: string`).join(', ')
  return `(${args}) => \`${template}\``
}

/**
 * Longest common leading path segments shared by every endpoint (never
 * includes a param segment) — e.g. '/client-api/v1' for a spec whose paths
 * all start with it. Empty string when paths diverge immediately.
 */
export function detectCommonPrefix(endpoints: Endpoint[]): string {
  if (endpoints.length === 0) return ''
  const segLists = endpoints.map((e) => e.path.split('/').filter(Boolean))
  const first = segLists[0]
  const common: string[] = []
  for (let i = 0; i < first.length - 1; i++) {
    const seg = first[i]
    if (seg.startsWith('{')) break
    // never swallow an entire path — each endpoint keeps at least one segment
    if (segLists.every((l) => l[i] === seg && l.length > i + 1)) common.push(seg)
    else break
  }
  return common.length > 0 ? `/${common.join('/')}` : ''
}

export interface CreateEndpointsOptions {
  /** Leading path prefix to drop from every URL (e.g. '/client-api/v1'). */
  stripPrefix?: string
  /** Group output by tag first, then by method inside each tag. */
  groupByTag?: boolean
}

function stripPathPrefix(path: string, prefix: string): string {
  if (!prefix) return path
  const clean = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix
  return path.startsWith(clean) ? path.slice(clean.length) || '/' : path
}

function renderMethodGroups(endpoints: Endpoint[], used: Set<string>, stripPrefix: string): string {
  const byMethod = new Map<string, string[]>()
  const ordered = [...endpoints].sort(
    (a, b) => METHOD_ORDER.indexOf(a.method) - METHOD_ORDER.indexOf(b.method),
  )

  for (const ep of ordered) {
    const effPath = stripPathPrefix(ep.path, stripPrefix)
    let key = ep.operationId ? camel(ep.operationId) : deriveKey(ep.method, effPath)
    let counter = 2
    const base = key
    while (used.has(key)) {
      key = `${base}${counter}`
      counter += 1
    }
    used.add(key)

    const lines = byMethod.get(ep.method) ?? []
    lines.push(`    ${key}: ${renderValue(effPath)},`)
    byMethod.set(ep.method, lines)
  }

  const groups: string[] = []
  const methods = [...METHOD_ORDER, ...[...byMethod.keys()].filter((m) => !METHOD_ORDER.includes(m))]
  for (const method of methods) {
    const lines = byMethod.get(method)
    if (!lines) continue
    groups.push(`    // ${method}\n${lines.join('\n')}`)
  }
  return groups.join('\n')
}

export function toCreateEndpoints(endpoints: Endpoint[], options: CreateEndpointsOptions = {}): string {
  const { stripPrefix = '', groupByTag = false } = options
  const used = new Set<string>()

  let body: string
  if (groupByTag) {
    const byTag = new Map<string, Endpoint[]>()
    for (const ep of endpoints) {
      const list = byTag.get(ep.tag) ?? []
      list.push(ep)
      byTag.set(ep.tag, list)
    }
    body = [...byTag.entries()]
      .map(([tag, eps]) => `    // ===== ${tag} =====\n${renderMethodGroups(eps, used, stripPrefix)}`)
      .join('\n\n')
  } else {
    body = renderMethodGroups(endpoints, used, stripPrefix)
  }

  return `function createEndpoints(basePath: string) {\n  return {\n${body}\n  } as const;\n}`
}
