import { describe, it, expect } from 'vitest'
import { computeTableShape } from './jsonTableRows'

describe('computeTableShape', () => {
  it('builds object-array shape with the union of keys as columns', () => {
    const shape = computeTableShape([{ a: 1, b: 2 }, { a: 3, c: 4 }])
    expect(shape.kind).toBe('object-array')
    if (shape.kind !== 'object-array') throw new Error('unreachable')
    expect(shape.columns.map((c) => c.key)).toEqual(['a', 'b', 'c'])
    expect(shape.rows).toHaveLength(2)
    expect(shape.rows[0].cells.a).toEqual({ kind: 'primitive', value: 1 })
    expect(shape.rows[1].cells.b).toEqual({ kind: 'primitive', value: undefined })
  })

  it('renders a nested object cell as an inline sub-table', () => {
    const shape = computeTableShape([{ address: { city: 'HCM', country: 'VN' } }])
    if (shape.kind !== 'object-array') throw new Error('unreachable')
    const cell = shape.rows[0].cells.address
    expect(cell.kind).toBe('nested')
    if (cell.kind !== 'nested') throw new Error('unreachable')
    expect(cell.rows).toEqual([
      { key: 'city', path: '[0].address.city', cell: { kind: 'primitive', value: 'HCM' } },
      { key: 'country', path: '[0].address.country', cell: { kind: 'primitive', value: 'VN' } },
    ])
  })

  it('renders a nested array cell as an inline sub-table with index keys', () => {
    const shape = computeTableShape([{ skills: ['a', 'b'] }])
    if (shape.kind !== 'object-array') throw new Error('unreachable')
    const cell = shape.rows[0].cells.skills
    if (cell.kind !== 'nested') throw new Error('unreachable')
    expect(cell.rows).toEqual([
      { key: '0', path: '[0].skills[0]', cell: { kind: 'primitive', value: 'a' } },
      { key: '1', path: '[0].skills[1]', cell: { kind: 'primitive', value: 'b' } },
    ])
  })

  it('builds key-value shape for a single object', () => {
    const shape = computeTableShape({ a: 1, b: 2 })
    expect(shape.kind).toBe('key-value')
    if (shape.kind !== 'key-value') throw new Error('unreachable')
    expect(shape.rows).toEqual([
      { key: 'a', path: 'a', cell: { kind: 'primitive', value: 1 } },
      { key: 'b', path: 'b', cell: { kind: 'primitive', value: 2 } },
    ])
  })

  it('builds index-value shape for an array of primitives', () => {
    const shape = computeTableShape(['x', 'y'])
    expect(shape.kind).toBe('index-value')
    if (shape.kind !== 'index-value') throw new Error('unreachable')
    expect(shape.rows).toEqual([
      { key: '0', path: '[0]', cell: { kind: 'primitive', value: 'x' } },
      { key: '1', path: '[1]', cell: { kind: 'primitive', value: 'y' } },
    ])
  })

  it('builds index-value shape for an empty array', () => {
    const shape = computeTableShape([])
    expect(shape).toEqual({ kind: 'index-value', rows: [] })
  })

  it('builds a single-row key-value shape for a primitive root', () => {
    const shape = computeTableShape(42)
    expect(shape).toEqual({ kind: 'key-value', rows: [{ key: '$', path: '$', cell: { kind: 'primitive', value: 42 } }] })
  })
})
