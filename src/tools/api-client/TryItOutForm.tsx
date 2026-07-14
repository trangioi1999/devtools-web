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

  const activeEnv = listEnvironments().find((e) => e.id === getActiveEnvironmentId())

  const handleSend = async () => {
    setError(null)
    setResponse(null)

    if (!activeEnv) {
      setError('No active environment selected. Create/select one above.')
      return
    }

    const built = buildRequest(endpoint, activeEnv, {
      path: pathValues,
      query: queryValues,
      headers: {},
      body: bodyText || undefined,
    })

    const start = performance.now()
    try {
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
        `Request failed: ${(err as Error).message}. If this is a cross-origin request, the server likely needs to allow this origin via CORS — ask the backend team to enable it, or configure a proxy URL prefix in settings.`,
      )
    }
  }

  const handleCopyCurl = () => {
    if (!activeEnv) return
    const built = buildRequest(endpoint, activeEnv, {
      path: pathValues,
      query: queryValues,
      headers: {},
      body: bodyText || undefined,
    })
    navigator.clipboard.writeText(toCurl(built))
  }

  return (
    <div className="p-3 flex flex-col gap-3">
      <h2 className="font-mono text-sm font-bold">{endpoint.method} {endpoint.path}</h2>

      {pathParams.map((p) => (
        <label key={p.name} className="text-sm">
          {p.name} (path{p.required ? ', required' : ''})
          <input
            className="block w-full border border-slate-300 rounded px-2 py-1"
            value={pathValues[p.name] ?? ''}
            onChange={(e) => setPathValues({ ...pathValues, [p.name]: e.target.value })}
          />
        </label>
      ))}

      {queryParams.map((p) => (
        <label key={p.name} className="text-sm">
          {p.name} (query{p.required ? ', required' : ''})
          <input
            className="block w-full border border-slate-300 rounded px-2 py-1"
            value={queryValues[p.name] ?? ''}
            onChange={(e) => setQueryValues({ ...queryValues, [p.name]: e.target.value })}
          />
        </label>
      ))}

      {endpoint.requestBodyExample !== undefined && (
        <label className="text-sm">
          Request body (JSON)
          <textarea
            className="block w-full h-32 border border-slate-300 rounded px-2 py-1 font-mono text-xs"
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
          />
        </label>
      )}

      <div className="flex gap-2">
        <button onClick={handleSend} className="px-3 py-1 text-sm rounded bg-slate-800 text-white">Send</button>
        <button onClick={handleCopyCurl} className="px-3 py-1 text-sm rounded bg-slate-200">Copy as cURL</button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {response && (
        <div className="border-t border-slate-200 pt-2">
          <div className="text-sm text-slate-600 mb-2">
            Status {response.status} · {response.timeMs} ms
          </div>
          {response.bodyJson !== undefined ? (
            <JsonTree value={response.bodyJson} />
          ) : (
            <pre className="text-xs whitespace-pre-wrap">{response.bodyText}</pre>
          )}
        </div>
      )}
    </div>
  )
}
