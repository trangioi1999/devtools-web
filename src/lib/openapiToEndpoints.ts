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

export function toCreateEndpoints(endpoints: Endpoint[]): string {
  const used = new Set<string>()
  const byMethod = new Map<string, string[]>()

  const ordered = [...endpoints].sort(
    (a, b) => METHOD_ORDER.indexOf(a.method) - METHOD_ORDER.indexOf(b.method),
  )

  for (const ep of ordered) {
    let key = ep.operationId ? camel(ep.operationId) : deriveKey(ep.method, ep.path)
    let counter = 2
    const base = key
    while (used.has(key)) {
      key = `${base}${counter}`
      counter += 1
    }
    used.add(key)

    const lines = byMethod.get(ep.method) ?? []
    lines.push(`    ${key}: ${renderValue(ep.path)},`)
    byMethod.set(ep.method, lines)
  }

  const groups: string[] = []
  const methods = [...METHOD_ORDER, ...[...byMethod.keys()].filter((m) => !METHOD_ORDER.includes(m))]
  for (const method of methods) {
    const lines = byMethod.get(method)
    if (!lines) continue
    groups.push(`    // ${method}\n${lines.join('\n')}`)
  }

  return `function createEndpoints(basePath: string) {\n  return {\n${groups.join('\n')}\n  } as const;\n}`
}
