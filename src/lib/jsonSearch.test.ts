import { describe, it, expect } from 'vitest'
import { matchesText, countJsonMatches } from './jsonSearch'

describe('matchesText', () => {
  it('matches case-insensitively', () => {
    expect(matchesText('Hello World', 'world')).toBe(true)
  })

  it('returns false for an empty query', () => {
    expect(matchesText('Hello', '')).toBe(false)
  })

  it('returns false when there is no match', () => {
    expect(matchesText('Hello', 'xyz')).toBe(false)
  })
})

describe('countJsonMatches', () => {
  it('returns 0 for an empty query', () => {
    expect(countJsonMatches({ a: 1 }, '')).toBe(0)
  })

  it('counts a matching top-level key', () => {
    expect(countJsonMatches({ hello: 1, other: 2 }, 'hello')).toBe(1)
  })

  it('counts a matching primitive value', () => {
    expect(countJsonMatches({ a: 'findme' }, 'findme')).toBe(1)
  })

  it('counts key and value matches separately', () => {
    expect(countJsonMatches({ findme: 'findme' }, 'findme')).toBe(2)
  })

  it('recurses into nested objects and arrays', () => {
    const value = { a: { b: [{ c: 'findme' }] } }
    expect(countJsonMatches(value, 'findme')).toBe(1)
  })

  it('sums multiple matches across siblings', () => {
    const value = [{ name: 'foo' }, { name: 'foobar' }, { name: 'baz' }]
    expect(countJsonMatches(value, 'foo')).toBe(2)
  })

  it('matches a primitive root value', () => {
    expect(countJsonMatches('findme', 'findme')).toBe(1)
  })
})
