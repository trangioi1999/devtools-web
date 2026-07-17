import { load } from 'js-yaml'
import type { ApiSpec, ApiModel, ApiResponse, Endpoint, EndpointParam, SchemaObject } from './types'

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const

function jsonContent(content: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!content) return undefined
  return (content['application/json'] ?? content['*/*'] ?? Object.values(content)[0]) as
    | Record<string, unknown>
    | undefined
}

function toEndpoint(path: string, method: string, operation: Record<string, unknown>): Endpoint {
  const tags = operation.tags as string[] | undefined
  const parameters = ((operation.parameters as Record<string, unknown>[] | undefined) ?? []).map(
    (p): EndpointParam => ({
      name: p.name as string,
      in: p.in as EndpointParam['in'],
      required: Boolean(p.required),
      example: p.example,
      description: p.description as string | undefined,
      schema: p.schema as SchemaObject | undefined,
    }),
  )

  const requestBody = operation.requestBody as Record<string, unknown> | undefined
  const requestContent = jsonContent(requestBody?.content as Record<string, unknown> | undefined)
  const rawResponses = (operation.responses ?? {}) as Record<string, Record<string, unknown>>

  const responses: ApiResponse[] = Object.entries(rawResponses).map(([status, r]) => {
    const content = jsonContent(r.content as Record<string, unknown> | undefined)
    return {
      status,
      description: r.description as string | undefined,
      schema: content?.schema as SchemaObject | undefined,
      example: content?.example,
    }
  })

  return {
    method: method.toUpperCase(),
    path,
    tag: tags?.[0] ?? 'default',
    summary: operation.summary as string | undefined,
    description: operation.description as string | undefined,
    operationId: operation.operationId as string | undefined,
    deprecated: Boolean(operation.deprecated) || undefined,
    parameters,
    requestBodyExample: requestContent?.example,
    requestBodySchema: requestContent?.schema as SchemaObject | undefined,
    responseExample: responses[0]?.example,
    responses,
  }
}

/** '#/components/schemas/Foo' -> 'Foo' (last path segment). */
export function refName(ref: string): string {
  const parts = ref.split('/')
  return parts[parts.length - 1]
}

export async function parseSpecFromText(
  text: string,
): Promise<{ ok: true; spec: ApiSpec } | { ok: false; error: string }> {
  let raw: unknown

  try {
    raw = JSON.parse(text)
  } catch {
    try {
      raw = load(text)
    } catch (yamlErr) {
      return { ok: false, error: `Could not parse as JSON or YAML: ${(yamlErr as Error).message}` }
    }
  }

  if (!raw || typeof raw !== 'object' || !('paths' in raw)) {
    return { ok: false, error: 'Spec is missing a "paths" object — not a valid OpenAPI document.' }
  }

  const doc = raw as {
    info?: { title?: string; version?: string; description?: string }
    servers?: { url?: string }[]
    paths: Record<string, Record<string, unknown>>
    components?: { schemas?: Record<string, SchemaObject> }
    definitions?: Record<string, SchemaObject> // Swagger 2.0
  }
  const endpoints: Endpoint[] = []

  for (const [path, pathItem] of Object.entries(doc.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method] as Record<string, unknown> | undefined
      if (operation) endpoints.push(toEndpoint(path, method, operation))
    }
  }

  const schemaMap = doc.components?.schemas ?? doc.definitions ?? {}
  const models: ApiModel[] = Object.entries(schemaMap).map(([name, schema]) => ({ name, schema }))

  return {
    ok: true,
    spec: {
      title: doc.info?.title ?? 'Untitled API',
      version: doc.info?.version,
      description: doc.info?.description,
      servers: (doc.servers ?? []).map((s) => s.url ?? '').filter(Boolean),
      endpoints,
      models,
    },
  }
}

export async function fetchSpec(
  url: string,
): Promise<{ ok: true; spec: ApiSpec } | { ok: false; error: string }> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      return { ok: false, error: `Fetch failed with status ${response.status}` }
    }
    const text = await response.text()
    return parseSpecFromText(text)
  } catch (err) {
    return { ok: false, error: `Network error fetching spec: ${(err as Error).message}` }
  }
}
