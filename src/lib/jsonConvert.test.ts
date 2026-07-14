import { describe, it, expect } from 'vitest'
import { toYaml, toTypeScriptInterface } from './jsonConvert'

describe('toYaml', () => {
  it('converts a simple object to YAML', () => {
    expect(toYaml({ a: 1, b: 'x' })).toBe('a: 1\nb: x\n')
  })
})

describe('toTypeScriptInterface', () => {
  it('generates an interface for a flat object', () => {
    const ts = toTypeScriptInterface({ a: 1, b: 'x', c: true })
    expect(ts).toContain('interface Root {')
    expect(ts).toContain('a: number')
    expect(ts).toContain('b: string')
    expect(ts).toContain('c: boolean')
  })

  it('generates a nested interface for a nested object', () => {
    const ts = toTypeScriptInterface({ address: { city: 'HCM' } })
    expect(ts).toContain('interface RootAddress {')
    expect(ts).toContain('city: string')
    expect(ts).toContain('address: RootAddress')
  })

  it('generates an array type from a homogeneous array', () => {
    const ts = toTypeScriptInterface({ tags: ['a', 'b'] })
    expect(ts).toContain('tags: string[]')
  })

  it('generates unknown[] for an empty array', () => {
    const ts = toTypeScriptInterface({ items: [] })
    expect(ts).toContain('items: unknown[]')
  })

  it('generates a union type for a mixed-type array', () => {
    const ts = toTypeScriptInterface({ mixed: [1, 'x'] })
    expect(ts).toContain('mixed: (number | string)[]')
  })

  it('maps null to the null type', () => {
    const ts = toTypeScriptInterface({ a: null })
    expect(ts).toContain('a: null')
  })

  it('uses a custom root name when provided', () => {
    const ts = toTypeScriptInterface({ a: 1 }, 'MyType')
    expect(ts).toContain('interface MyType {')
  })

  it('merges an array of objects into a single interface instead of duplicate declarations', () => {
    const ts = toTypeScriptInterface({ items: [{ a: 1 }, { b: 'x' }] })
    const occurrences = ts.match(/interface RootItems \{/g)
    expect(occurrences).toHaveLength(1)
    expect(ts).toContain('a: number')
    expect(ts).toContain('b: string')
  })

  it('merges array-of-object field types across elements when a field type differs', () => {
    const ts = toTypeScriptInterface({ items: [{ a: 1 }, { a: 'x' }] })
    const occurrences = ts.match(/interface RootItems \{/g)
    expect(occurrences).toHaveLength(1)
    expect(ts).toContain('a: number | string')
  })
})
