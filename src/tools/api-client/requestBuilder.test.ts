import { describe, it, expect } from 'vitest'
import { buildRequest } from './requestBuilder'
import type { Endpoint } from './types'
import type { Environment } from './environmentStore'

const endpoint: Endpoint = {
  method: 'GET',
  path: '/users/{id}',
  tag: 'Users',
  parameters: [],
}

describe('buildRequest', () => {
  it('substitutes path params and appends query params to the base URL', () => {
    const env: Environment = { id: '1', name: 'dev', baseUrl: 'https://api.dev', auth: { type: 'none' } }
    const req = buildRequest(endpoint, env, { path: { id: '42' }, query: { verbose: 'true' }, headers: {} })
    expect(req.url).toBe('https://api.dev/users/42?verbose=true')
    expect(req.method).toBe('GET')
  })

  it('injects a bearer token as an Authorization header', () => {
    const env: Environment = { id: '1', name: 'dev', baseUrl: 'https://api.dev', auth: { type: 'bearer', token: 'tok123' } }
    const req = buildRequest(endpoint, env, { path: { id: '1' }, query: {}, headers: {} })
    expect(req.headers.Authorization).toBe('Bearer tok123')
  })

  it('injects an API key into a query param when configured for query', () => {
    const env: Environment = {
      id: '1', name: 'dev', baseUrl: 'https://api.dev',
      auth: { type: 'apiKey', location: 'query', name: 'api_key', value: 'xyz' },
    }
    const req = buildRequest(endpoint, env, { path: { id: '1' }, query: {}, headers: {} })
    expect(req.url).toContain('api_key=xyz')
  })

  it('injects basic auth as a base64 Authorization header', () => {
    const env: Environment = {
      id: '1', name: 'dev', baseUrl: 'https://api.dev',
      auth: { type: 'basic', username: 'u', password: 'p' },
    }
    const req = buildRequest(endpoint, env, { path: { id: '1' }, query: {}, headers: {} })
    expect(req.headers.Authorization).toBe(`Basic ${btoa('u:p')}`)
  })

  it('includes a JSON body and content-type header when provided', () => {
    const env: Environment = { id: '1', name: 'dev', baseUrl: 'https://api.dev', auth: { type: 'none' } }
    const req = buildRequest(endpoint, env, { path: { id: '1' }, query: {}, headers: {}, body: '{"x":1}' })
    expect(req.body).toBe('{"x":1}')
    expect(req.headers['Content-Type']).toBe('application/json')
  })
})
