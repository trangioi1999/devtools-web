import { describe, it, expect } from 'vitest'
import { escapeJsonString, unescapeJsonString } from './jsonEscape'

describe('escapeJsonString', () => {
  it('wraps text as a JSON string literal, escaping quotes and newlines', () => {
    expect(escapeJsonString('{"a":1}\nline2')).toBe(JSON.stringify('{"a":1}\nline2'))
  })
})

describe('unescapeJsonString', () => {
  it('extracts the inner string from a JSON string literal', () => {
    const escaped = JSON.stringify('{"a":1}')
    const result = unescapeJsonString(escaped)
    expect(result).toEqual({ ok: true, result: '{"a":1}' })
  })

  it('returns an error when the input is not valid JSON', () => {
    const result = unescapeJsonString('not json at all {{{')
    expect(result.ok).toBe(false)
  })

  it('returns an error when the parsed JSON is not a string', () => {
    const result = unescapeJsonString('{"a":1}')
    expect(result).toEqual({ ok: false, error: expect.any(String) })
  })
})
