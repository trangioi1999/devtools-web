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
