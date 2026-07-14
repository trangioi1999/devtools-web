export interface EndpointParam {
  name: string
  in: 'path' | 'query' | 'header'
  required: boolean
  example?: unknown
}

export interface Endpoint {
  method: string
  path: string
  tag: string
  summary?: string
  parameters: EndpointParam[]
  requestBodyExample?: unknown
  responseExample?: unknown
}

export interface ApiSpec {
  title: string
  endpoints: Endpoint[]
}
