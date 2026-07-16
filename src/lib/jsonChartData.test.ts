import { describe, it, expect } from 'vitest'
import { computeChartData } from './jsonChartData'

describe('computeChartData', () => {
  it('rejects a non-array value', () => {
    const result = computeChartData({ a: 1 })
    expect(result.ok).toBe(false)
  })

  it('rejects an empty array', () => {
    expect(computeChartData([]).ok).toBe(false)
  })

  it('rejects an array of non-objects', () => {
    expect(computeChartData([1, 2, 3]).ok).toBe(false)
  })

  it('rejects an array of objects with no numeric field', () => {
    const result = computeChartData([{ name: 'a' }, { name: 'b' }])
    expect(result.ok).toBe(false)
  })

  it('accepts an array of objects with a numeric field, classifying string/number fields', () => {
    const result = computeChartData([{ name: 'a', score: 1 }, { name: 'b', score: 2 }])
    expect(result).toEqual({
      ok: true,
      fields: [
        { key: 'name', type: 'string' },
        { key: 'score', type: 'number' },
      ],
      numericFields: ['score'],
      labelFields: ['name'],
      data: [{ name: 'a', score: 1 }, { name: 'b', score: 2 }],
    })
  })

  it('skips fields whose first seen value is neither string nor number', () => {
    const result = computeChartData([{ active: true, score: 1 }])
    if (!result.ok) throw new Error('unreachable')
    expect(result.fields.map((f) => f.key)).toEqual(['score'])
  })
})
