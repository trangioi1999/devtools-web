import { describe, it, expect, vi, afterEach } from 'vitest'
import { parseSpecFromText, fetchSpec } from './specParser'

const sampleSpec = {
  openapi: '3.0.0',
  info: { title: 'Sample API' },
  paths: {
    '/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get a user',
        parameters: [
          { name: 'id', in: 'path', required: true, example: '123' },
        ],
        responses: {
          '200': {
            content: {
              'application/json': { example: { id: '123', name: 'Ada' } },
            },
          },
        },
      },
    },
  },
}

describe('parseSpecFromText', () => {
  it('parses a JSON OpenAPI spec into flattened endpoints', async () => {
    const result = await parseSpecFromText(JSON.stringify(sampleSpec))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.spec.title).toBe('Sample API')
      expect(result.spec.endpoints).toHaveLength(1)
      expect(result.spec.endpoints[0]).toMatchObject({
        method: 'GET',
        path: '/users/{id}',
        tag: 'Users',
      })
    }
  })

  it('parses an equivalent YAML OpenAPI spec', async () => {
    const yaml = `
openapi: 3.0.0
info:
  title: Sample API
paths:
  /ping:
    get:
      tags: [Health]
      responses:
        '200':
          description: ok
`
    const result = await parseSpecFromText(yaml)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.spec.endpoints[0].path).toBe('/ping')
    }
  })

  it('returns an error for unparseable text', async () => {
    const result = await parseSpecFromText('not: [valid, yaml: json {{{')
    expect(result.ok).toBe(false)
  })
})

describe('fetchSpec', () => {
  afterEach(() => vi.restoreAllMocks())

  it('fetches and parses a spec from a URL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(sampleSpec)),
    }))

    const result = await fetchSpec('https://example.com/openapi.json')
    expect(result.ok).toBe(true)
  })

  it('returns an error when the fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    const result = await fetchSpec('https://example.com/openapi.json')
    expect(result.ok).toBe(false)
  })
})
