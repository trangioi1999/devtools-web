/** JSON-Schema-like object as it appears in an OpenAPI document ($refs kept). */
export type SchemaObject = Record<string, unknown>

export interface EndpointParam {
  name: string
  in: 'path' | 'query' | 'header'
  required: boolean
  example?: unknown
  description?: string
  schema?: SchemaObject
}

export interface ApiResponse {
  status: string
  description?: string
  schema?: SchemaObject
  example?: unknown
}

export interface Endpoint {
  method: string
  path: string
  tag: string
  summary?: string
  description?: string
  operationId?: string
  deprecated?: boolean
  parameters: EndpointParam[]
  requestBodyExample?: unknown
  requestBodySchema?: SchemaObject
  responseExample?: unknown
  responses?: ApiResponse[]
}

export interface ApiModel {
  name: string
  schema: SchemaObject
}

export interface ApiSpec {
  title: string
  version?: string
  description?: string
  servers?: string[]
  endpoints: Endpoint[]
  models?: ApiModel[]
}
