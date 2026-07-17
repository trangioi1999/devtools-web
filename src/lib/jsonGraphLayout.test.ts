import { describe, it, expect } from 'vitest'
import { computeJsonGraphLayout, computeRelatedIds, MAX_NODES } from './jsonGraphLayout'

describe('computeJsonGraphLayout', () => {
  it('returns a single card for a primitive root', () => {
    const result = computeJsonGraphLayout(42)
    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0].data.rows).toEqual([{ key: '$', path: '$', kind: 'primitive', value: 42 }])
    expect(result.edges).toEqual([])
  })

  it('builds one card with primitive rows for a flat object', () => {
    const result = computeJsonGraphLayout({ a: 1, b: 'x' })
    expect(result.nodes).toHaveLength(1)
    const [card] = result.nodes
    expect(card.data.rows).toEqual([
      { key: 'a', path: 'a', kind: 'primitive', value: 1 },
      { key: 'b', path: 'b', kind: 'primitive', value: 'x' },
    ])
  })

  it('creates a child card and edge for a nested object', () => {
    const result = computeJsonGraphLayout({ address: { city: 'HCM' } })
    expect(result.nodes).toHaveLength(2)
    const root = result.nodes.find((n) => n.id === '$')
    const child = result.nodes.find((n) => n.id === 'address')
    expect(root?.data.rows).toEqual([{ key: 'address', path: 'address', kind: 'object', count: 1, childId: 'address' }])
    expect(child?.data.rows).toEqual([{ key: 'city', path: 'address.city', kind: 'primitive', value: 'HCM' }])
    expect(result.edges).toEqual([{ id: '$->address', source: '$', target: 'address', sourceHandle: 'address' }])
  })

  it('marks array rows with kind "array" and index-based child paths', () => {
    const result = computeJsonGraphLayout({ tags: [{ n: 1 }] })
    const root = result.nodes.find((n) => n.id === '$')
    expect(root?.data.rows).toEqual([{ key: 'tags', path: 'tags', kind: 'array', count: 1, childId: 'tags' }])
    const child = result.nodes.find((n) => n.id === 'tags')
    expect(child?.data.rows).toEqual([{ key: '0', path: 'tags[0]', kind: 'object', count: 1, childId: 'tags[0]' }])
  })

  it('is not truncated for small input', () => {
    const result = computeJsonGraphLayout({ a: 1 })
    expect(result.truncated).toBe(false)
  })

  it('truncates and stops creating child cards once the node cap is reached', () => {
    const value = Array.from({ length: 400 }, (_, i) => ({ id: i, nested: { x: i } }))
    const result = computeJsonGraphLayout(value)
    expect(result.truncated).toBe(true)
    expect(result.nodes.length).toBeLessThanOrEqual(MAX_NODES)
    const root = result.nodes.find((n) => n.id === '$')
    const untruncatedRow = root?.data.rows.find((r) => r.childId)
    const truncatedRow = root?.data.rows.find((r) => r.kind === 'object' && !r.childId)
    expect(untruncatedRow).toBeDefined()
    expect(truncatedRow).toBeDefined()
  })

  it('assigns non-overlapping positions computed by dagre', () => {
    const result = computeJsonGraphLayout({ address: { city: 'HCM' } })
    const [a, b] = result.nodes
    expect(a.position).not.toEqual(b.position)
  })
})

describe('focus mode', () => {
  const doc = { a: { b: { c: 1 } }, x: { y: 2 } }

  it('keeps only ancestors, self, and descendants of the focused card', () => {
    const result = computeJsonGraphLayout(doc, 'a')
    const ids = result.nodes.map((n) => n.id).sort()
    expect(ids).toEqual(['$', 'a', 'a.b'])
    expect(result.focusChain).toEqual(['$', 'a'])
    expect(result.edges.every((e) => ids.includes(e.source) && ids.includes(e.target))).toBe(true)
  })

  it('ignores an unknown focus id and returns the full graph', () => {
    const full = computeJsonGraphLayout(doc)
    const result = computeJsonGraphLayout(doc, 'nope')
    expect(result.nodes.map((n) => n.id).sort()).toEqual(full.nodes.map((n) => n.id).sort())
    expect(result.focusChain).toEqual([])
  })

  it('computeRelatedIds walks up to the root and down to all descendants', () => {
    const { edges } = computeJsonGraphLayout(doc)
    const { related, chain } = computeRelatedIds(edges, 'a.b')
    expect(chain).toEqual(['$', 'a', 'a.b'])
    expect([...related].sort()).toEqual(['$', 'a', 'a.b'])
  })
})
