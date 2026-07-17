import { describe, it, expect } from 'vitest'
import { diffApiSpecs } from './apiSpecDiff'
import type { ApiSpec, Endpoint } from '../tools/api-client/types'

function ep(method: string, path: string, extra: Partial<Endpoint> = {}): Endpoint {
  return { method, path, tag: 'default', parameters: [], responses: [], ...extra }
}

function spec(endpoints: Endpoint[], models: ApiSpec['models'] = []): ApiSpec {
  return { title: 'T', endpoints, models }
}

describe('diffApiSpecs', () => {
  it('detects added and removed endpoints', () => {
    const diff = diffApiSpecs(spec([ep('GET', '/a')]), spec([ep('GET', '/b')]))
    expect(diff.endpoints).toEqual([
      { kind: 'added', method: 'GET', path: '/b', details: [] },
      { kind: 'removed', method: 'GET', path: '/a', details: [] },
    ])
  })

  it('detects parameter and response modifications', () => {
    const left = ep('GET', '/a', {
      parameters: [{ name: 'q', in: 'query', required: false, schema: { type: 'string' } }],
      responses: [{ status: '200' }],
    })
    const right = ep('GET', '/a', {
      parameters: [
        { name: 'q', in: 'query', required: true, schema: { type: 'integer' } },
        { name: 'page', in: 'query', required: false, schema: { type: 'integer' } },
      ],
      responses: [{ status: '200' }, { status: '400' }],
    })
    const diff = diffApiSpecs(spec([left]), spec([right]))
    expect(diff.endpoints).toHaveLength(1)
    const details = diff.endpoints[0].details
    expect(details).toContain("param 'q' type changed (string → integer)")
    expect(details).toContain("param 'q' now required")
    expect(details).toContain("param 'page' added (query, integer)")
    expect(details).toContain('response 400 added')
  })

  it('reports body property type changes with old and new types', () => {
    const left = ep('PUT', '/a', {
      requestBodySchema: { type: 'object', properties: { amount: { type: 'number' }, note: { type: 'string' } } },
    })
    const right = ep('PUT', '/a', {
      requestBodySchema: { type: 'object', properties: { amount: { type: 'string' }, note: { type: 'string' } } },
    })
    const diff = diffApiSpecs(spec([left]), spec([right]))
    expect(diff.endpoints[0].details).toContain("request body: property 'amount' type changed (number → string)")
  })

  it('reports a response model swap by ref name', () => {
    const left = ep('GET', '/a', { responses: [{ status: '200', schema: { $ref: '#/components/schemas/OldModel' } }] })
    const right = ep('GET', '/a', { responses: [{ status: '200', schema: { $ref: '#/components/schemas/NewModel' } }] })
    const diff = diffApiSpecs(spec([left]), spec([right]))
    expect(diff.endpoints[0].details).toContain('response 200: type changed (OldModel → NewModel)')
  })

  it('reports unchanged specs as empty diff', () => {
    const a = spec([ep('GET', '/a')], [{ name: 'M', schema: { type: 'object' } }])
    expect(diffApiSpecs(a, a)).toEqual({ endpoints: [], models: [] })
  })

  it('detects added, removed, and modified models with a deep diff tree', () => {
    const left = spec([], [
      { name: 'Kept', schema: { type: 'object', properties: { a: { type: 'string' } } } },
      { name: 'Gone', schema: { type: 'object' } },
    ])
    const right = spec([], [
      { name: 'Kept', schema: { type: 'object', properties: { a: { type: 'integer' } } } },
      { name: 'Fresh', schema: { type: 'object' } },
    ])
    const diff = diffApiSpecs(left, right)
    expect(diff.models.map((m) => [m.kind, m.name])).toEqual([
      ['added', 'Fresh'],
      ['removed', 'Gone'],
      ['modified', 'Kept'],
    ])
    const kept = diff.models.find((m) => m.name === 'Kept')
    expect(kept?.diff?.hasChanges).toBe(true)
  })
})
