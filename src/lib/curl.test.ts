import { describe, it, expect } from 'vitest'
import { toCurl } from './curl'

describe('toCurl', () => {
  it('builds a GET command with headers', () => {
    const cmd = toCurl({ url: 'https://api.dev/x', method: 'GET', headers: { Authorization: 'Bearer t' } })
    expect(cmd).toBe(`curl -X GET 'https://api.dev/x' -H 'Authorization: Bearer t'`)
  })

  it('includes a body with -d when present', () => {
    const cmd = toCurl({
      url: 'https://api.dev/x',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"a":1}',
    })
    expect(cmd).toBe(
      `curl -X POST 'https://api.dev/x' -H 'Content-Type: application/json' -d '{"a":1}'`,
    )
  })
})
