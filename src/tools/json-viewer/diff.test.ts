import { describe, it, expect } from 'vitest'
import { computeDiffTree } from './diff'

describe('computeDiffTree', () => {
  it('marks identical primitives as unchanged', () => {
    const tree = computeDiffTree({ a: 1 }, { a: 1 })
    expect(tree.children?.[0]).toMatchObject({ status: 'unchanged', key: 'a', value: 1 })
  })

  it('marks a changed primitive value as modified with old and new values', () => {
    const tree = computeDiffTree({ a: 1 }, { a: 2 })
    expect(tree.children?.[0]).toMatchObject({ status: 'modified', key: 'a', oldValue: 1, value: 2 })
  })

  it('marks a key only on the right as added', () => {
    const tree = computeDiffTree({ a: 1 }, { a: 1, b: 2 })
    const added = tree.children?.find((c) => c.key === 'b')
    expect(added).toMatchObject({ status: 'added', value: 2 })
  })

  it('marks a key only on the left as removed', () => {
    const tree = computeDiffTree({ a: 1, b: 2 }, { a: 1 })
    const removed = tree.children?.find((c) => c.key === 'b')
    expect(removed).toMatchObject({ status: 'removed', oldValue: 2 })
  })

  it('recurses into nested objects, marking only the changed leaf', () => {
    const tree = computeDiffTree({ a: { b: 1, c: 1 } }, { a: { b: 1, c: 2 } })
    const aNode = tree.children?.find((c) => c.key === 'a')
    expect(aNode?.status).toBe('unchanged')
    const cNode = aNode?.children?.find((c) => c.key === 'c')
    expect(cNode).toMatchObject({ status: 'modified', oldValue: 1, value: 2 })
  })

  it('returns an unchanged root with no children for two identical empty objects', () => {
    const tree = computeDiffTree({}, {})
    expect(tree).toMatchObject({ status: 'unchanged', key: '$', children: [] })
  })
})
