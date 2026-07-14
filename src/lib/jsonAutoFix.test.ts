import { describe, it, expect } from 'vitest'
import { parseJsonStrict, autoFixJson } from './jsonAutoFix'

describe('parseJsonStrict', () => {
  it('parses valid JSON', () => {
    const result = parseJsonStrict('{"a": 1}')
    expect(result).toEqual({ ok: true, value: { a: 1 } })
  })

  it('reports line/column for invalid JSON', () => {
    const result = parseJsonStrict('{\n  "a": ,\n}')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0].line).toBeGreaterThanOrEqual(2)
    }
  })
})

describe('autoFixJson', () => {
  it('fixes a trailing comma', () => {
    const result = autoFixJson('{"a": 1, "b": 2,}')
    expect(result.changed).toBe(true)
    expect(JSON.parse(result.fixed as string)).toEqual({ a: 1, b: 2 })
  })

  it('fixes single-quoted strings and unquoted keys', () => {
    const result = autoFixJson("{a: 'x'}")
    expect(result.changed).toBe(true)
    expect(JSON.parse(result.fixed as string)).toEqual({ a: 'x' })
  })

  it('returns changed:false for already-valid strict JSON with identical formatting intent', () => {
    const result = autoFixJson('{"a":1}')
    expect(result.fixed).not.toBeNull()
    expect(JSON.parse(result.fixed as string)).toEqual({ a: 1 })
  })

  it('returns fixed:null for unrecoverable input', () => {
    const result = autoFixJson('{a: b c d')
    expect(result.fixed).toBeNull()
    expect(result.changed).toBe(false)
  })
})
