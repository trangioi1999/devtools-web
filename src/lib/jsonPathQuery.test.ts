import { describe, it, expect } from 'vitest'
import { queryJsonPath } from './jsonPathQuery'

const sample = { a: { b: [10, 20, 30] }, c: 'x' }

describe('queryJsonPath', () => {
  it('resolves a simple path to a single result', () => {
    const result = queryJsonPath(sample, '$.c')
    expect(result).toEqual({ ok: true, results: [{ path: '$.c', value: 'x' }] })
  })

  it('resolves an array index path', () => {
    const result = queryJsonPath(sample, '$.a.b[1]')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.results).toEqual([{ path: '$.a.b[1]', value: 20 }])
    }
  })

  it('resolves a wildcard to multiple results', () => {
    const result = queryJsonPath(sample, '$.a.b[*]')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.results.map((r) => r.value)).toEqual([10, 20, 30])
    }
  })

  it('returns ok:true with an empty results array for a path that matches nothing', () => {
    const result = queryJsonPath(sample, '$.nonexistent')
    expect(result).toEqual({ ok: true, results: [] })
  })

  it('returns an error for malformed JSONPath syntax', () => {
    const result = queryJsonPath(sample, '$[')
    expect(result.ok).toBe(false)
  })
})
