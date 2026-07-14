import { load } from 'js-yaml'
import type { ApiSpec, Endpoint, EndpointParam } from './types'

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const

function extractExample(content: Record<string, unknown> | undefined): unknown {
  if (!content) return undefined
  const json = content['application/json'] as Record<string, unknown> | undefined
  return json?.example
}

function toEndpoint(path: string, method: string, operation: Record<string, unknown>): Endpoint {
  const tags = operation.tags as string[] | undefined
  const parameters = ((operation.parameters as Record<string, unknown>[] | undefined) ?? []).map(
    (p): EndpointParam => ({
      name: p.name as string,
      in: p.in as EndpointParam['in'],
      required: Boolean(p.required),
      example: p.example,
    }),
  )

  const requestBody = operation.requestBody as Record<string, unknown> | undefined
  const responses = operation.responses as Record<string, Record<string, unknown>> | undefined
  const firstResponse = responses ? Object.values(responses)[0] : undefined

  return {
    method: method.toUpperCase(),
    path,
    tag: tags?.[0] ?? 'default',
    summary: operation.summary as string | undefined,
    parameters,
    requestBodyExample: extractExample(requestBody?.content as Record<string, unknown> | undefined),
    responseExample: extractExample(firstResponse?.content as Record<string, unknown> | undefined),
  }
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

  const doc = raw as { info?: { title?: string }; paths: Record<string, Record<string, unknown>> }
  const endpoints: Endpoint[] = []

  for (const [path, pathItem] of Object.entries(doc.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method] as Record<string, unknown> | undefined
      if (operation) endpoints.push(toEndpoint(path, method, operation))
    }
  }

  return { ok: true, spec: { title: doc.info?.title ?? 'Untitled API', endpoints } }
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
