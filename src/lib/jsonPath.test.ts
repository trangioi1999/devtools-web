import { describe, it, expect } from 'vitest'
import { buildJsonPath } from './jsonPath'

describe('buildJsonPath', () => {
  it('builds a root-relative dot path', () => {
    expect(buildJsonPath(['a', 'b'])).toBe('a.b')
  })

  it('renders numeric segments as array indices', () => {
    expect(buildJsonPath(['a', 'b', 0, 'c'])).toBe('a.b[0].c')
  })

  it('returns "$" for the root path', () => {
    expect(buildJsonPath([])).toBe('$')
  })
})
