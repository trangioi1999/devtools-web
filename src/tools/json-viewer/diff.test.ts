import { describe, it, expect } from 'vitest'
import { computeDiffTree, countDiffs } from './diff'

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

  it('recurses into arrays by index', () => {
    const tree = computeDiffTree({ a: [1, 2] }, { a: [1, 3, 4] })
    const aNode = tree.children?.find((c) => c.key === 'a')
    expect(aNode?.kind).toBe('array')
    expect(aNode?.children?.[0]).toMatchObject({ status: 'unchanged', key: 0 })
    expect(aNode?.children?.[1]).toMatchObject({ status: 'modified', key: 1, oldValue: 2, value: 3 })
    expect(aNode?.children?.[2]).toMatchObject({ status: 'added', key: 2, value: 4 })
  })

  it('builds expandable children for an added object subtree', () => {
    const tree = computeDiffTree({}, { a: { b: 1 } })
    const aNode = tree.children?.find((c) => c.key === 'a')
    expect(aNode).toMatchObject({ status: 'added', kind: 'object', hasChanges: true })
    expect(aNode?.children?.[0]).toMatchObject({ status: 'added', key: 'b', value: 1 })
  })

  it('bubbles hasChanges up through unchanged containers', () => {
    const tree = computeDiffTree({ a: { b: { c: 1 } }, x: 1 }, { a: { b: { c: 2 } }, x: 1 })
    const aNode = tree.children?.find((c) => c.key === 'a')
    expect(aNode?.status).toBe('unchanged')
    expect(aNode?.hasChanges).toBe(true)
    const xNode = tree.children?.find((c) => c.key === 'x')
    expect(xNode?.hasChanges).toBe(false)
  })
})

describe('countDiffs', () => {
  it('counts top-most added, removed, and modified nodes once each', () => {
    const tree = computeDiffTree({ a: 1, b: { x: 1 }, c: 3 }, { a: 2, c: 3, d: { y: [1, 2] } })
    expect(countDiffs(tree)).toEqual({ added: 1, removed: 1, modified: 1 })
  })
})
