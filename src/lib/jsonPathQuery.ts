import { JSONPath } from 'jsonpath-plus'

export interface JsonPathMatch {
  path: string
  value: unknown
}

export type JsonPathQueryResult =
  | { ok: true; results: JsonPathMatch[] }
  | { ok: false; error: string }

function normalizePath(bracketPath: string): string {
  // Convert bracket notation like $['a']['b'][1] to dot notation like $.a.b[1]
  let result = bracketPath.replace(/^\$/, '$')

  // Replace $['key'] with $.key, but keep numeric indices as [n]
  result = result.replace(/\[['"]([^'"]+)['"]\]/g, (match, key) => {
    if (/^\d+$/.test(key)) {
      return `[${key}]`
    }
    return `.${key}`
  })

  // Clean up any leading dots after $
  result = result.replace(/^\$\./, '$.')

  return result
}

function validatePath(path: string): string | null {
  // Basic validation: check for obvious syntax errors
  // Check for unmatched brackets
  let bracketCount = 0
  for (let i = 0; i < path.length; i++) {
    if (path[i] === '[') bracketCount++
    if (path[i] === ']') bracketCount--
    if (bracketCount < 0) {
      return 'Mismatched brackets in JSONPath'
    }
  }
  if (bracketCount !== 0) {
    return 'Unmatched brackets in JSONPath'
  }

  // Check for incomplete syntax like $[ without anything after
  if (/\[\s*$/.test(path) || /\[\s*\]/.test(path)) {
    return 'Incomplete bracket expression in JSONPath'
  }

  return null
}

export function queryJsonPath(value: unknown, path: string): JsonPathQueryResult {
  // Validate path syntax
  const validationError = validatePath(path)
  if (validationError) {
    return { ok: false, error: `Invalid JSONPath: ${validationError}` }
  }

  try {
    const matches = JSONPath({ path, json: value as object, resultType: 'all' }) as Array<{
      path: string
      value: unknown
    }>

    return {
      ok: true,
      results: matches.map((m) => ({ path: normalizePath(m.path), value: m.value })),
    }
  } catch (err) {
    return { ok: false, error: `Invalid JSONPath: ${(err as Error).message}` }
  }
}
