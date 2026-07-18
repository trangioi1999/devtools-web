import { useState } from 'react'
import type { Endpoint } from './types'
import { listEnvironments, getActiveEnvironmentId } from './environmentStore'
import { buildRequest } from './requestBuilder'
import { toCurl } from '../../lib/curl'
import { JsonTree } from '../../components/JsonTree'

interface ResponseState {
  status: number
  headers: Record<string, string>
  bodyText: string
  bodyJson: unknown
  timeMs: number
}

export function TryItOutForm({ endpoint }: { endpoint: Endpoint }) {
  const [pathValues, setPathValues] = useState<Record<string, string>>({})
  const [queryValues, setQueryValues] = useState<Record<string, string>>({})
  const [bodyText, setBodyText] = useState(
    endpoint.requestBodyExample ? JSON.stringify(endpoint.requestBodyExample, null, 2) : '',
  )
  const [response, setResponse] = useState<ResponseState | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pathParams = endpoint.parameters.filter((p) => p.in === 'path')
  const queryParams = endpoint.parameters.filter((p) => p.in === 'query')

  const getActiveEnv = () => listEnvironments().find((e) => e.id === getActiveEnvironmentId())

  const handleSend = async () => {
    setError(null)
    setResponse(null)

    const activeEnv = getActiveEnv()
    if (!activeEnv) {
      setError('No active environment selected. Create/select one above.')
      return
    }

    const start = performance.now()
    try {
      const built = buildRequest(endpoint, activeEnv, {
        path: pathValues,
        query: queryValues,
        headers: {},
        body: bodyText || undefined,
      })

      const res = await fetch(built.url, { method: built.method, headers: built.headers, body: built.body })
      const timeMs = Math.round(performance.now() - start)
      const text = await res.text()
      let json: unknown
      try {
        json = JSON.parse(text)
      } catch {
        json = undefined
      }

      const headers: Record<string, string> = {}
      res.headers.forEach((v, k) => (headers[k] = v))

      setResponse({ status: res.status, headers, bodyText: text, bodyJson: json, timeMs })
    } catch (err) {
      setError(
        `Request failed: ${(err as Error).message}. If this is a cross-origin request, the server likely needs to allow this origin via CORS — ask the backend team to enable it, or use an external proxy (e.g. a Cloudflare Worker) in front of the API.`,
      )
    }
  }

  const handleCopyCurl = () => {
    const activeEnv = getActiveEnv()
    if (!activeEnv) {
      setError('No active environment selected. Create/select one above.')
      return
    }
    try {
      const built = buildRequest(endpoint, activeEnv, {
        path: pathValues,
        query: queryValues,
        headers: {},
        body: bodyText || undefined,
      })
      navigator.clipboard.writeText(toCurl(built))
    } catch (err) {
      setError(`Could not build request: ${(err as Error).message}`)
    }
  }

  return (
    <div className="p-3 flex flex-col gap-3">
      <h6 className="font-mono normal-case tracking-normal">{endpoint.method} {endpoint.path}</h6>

      {pathParams.map((p) => (
        <label key={p.name} className="field">
          <label>{p.name} (path{p.required ? ', required' : ''})</label>
          <input
            className="input"
            value={pathValues[p.name] ?? ''}
            onChange={(e) => setPathValues({ ...pathValues, [p.name]: e.target.value })}
          />
        </label>
      ))}

      {queryParams.map((p) => (
        <label key={p.name} className="field">
          <label>{p.name} (query{p.required ? ', required' : ''})</label>
          <input
            className="input"
            value={queryValues[p.name] ?? ''}
            onChange={(e) => setQueryValues({ ...queryValues, [p.name]: e.target.value })}
          />
        </label>
      ))}

      {endpoint.requestBodyExample !== undefined && (
        <label className="field">
          <label>Request body (JSON)</label>
          <textarea
            className="input font-mono text-xs"
            style={{ height: 128 }}
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
          />
        </label>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={handleSend} className="btn btn-primary">Send</button>
        <button type="button" onClick={handleCopyCurl} className="btn btn-secondary">Copy as cURL</button>
      </div>

      {error && <div className="text-sm text-delete">{error}</div>}

      {response && (
        <div className="border-t border-divider pt-2">
          <div className="text-sm text-muted mb-2">
            Status {response.status} · {response.timeMs} ms
          </div>
          {response.bodyJson !== undefined ? (
            <JsonTree value={response.bodyJson} />
          ) : (
            <pre className="text-xs whitespace-pre-wrap font-mono">{response.bodyText}</pre>
          )}
        </div>
      )}
    </div>
  )
}
