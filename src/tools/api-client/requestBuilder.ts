import type { Endpoint } from './types'
import type { Environment } from './environmentStore'

export interface BuiltRequest {
  url: string
  method: string
  headers: Record<string, string>
  body?: string
}

export interface RequestValues {
  path: Record<string, string>
  query: Record<string, string>
  headers: Record<string, string>
  body?: string
}

function substitutePath(path: string, values: Record<string, string>): string {
  return path.replace(/\{(\w+)\}/g, (_, name) => encodeURIComponent(values[name] ?? ''))
}

export function buildRequest(endpoint: Endpoint, env: Environment, values: RequestValues): BuiltRequest {
  const path = substitutePath(endpoint.path, values.path)
  const url = new URL(env.baseUrl.replace(/\/$/, '') + path)

  for (const [k, v] of Object.entries(values.query)) {
    url.searchParams.set(k, v)
  }

  const headers: Record<string, string> = { ...values.headers }

  switch (env.auth.type) {
    case 'bearer':
      headers.Authorization = `Bearer ${env.auth.token}`
      break
    case 'basic':
      headers.Authorization = `Basic ${btoa(`${env.auth.username}:${env.auth.password}`)}`
      break
    case 'apiKey':
      if (env.auth.location === 'header') headers[env.auth.name] = env.auth.value
      else url.searchParams.set(env.auth.name, env.auth.value)
      break
    case 'none':
      break
  }

  if (values.body) headers['Content-Type'] = 'application/json'

  return {
    url: url.toString(),
    method: endpoint.method,
    headers,
    body: values.body,
  }
}
