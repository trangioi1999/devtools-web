import { useState } from 'react'
import type { ApiSpec, Endpoint } from './types'
import { parseSpecFromText, fetchSpec } from './specParser'
import { EnvironmentManager } from './EnvironmentManager'
import { EndpointList } from './EndpointList'
import { TryItOutForm } from './TryItOutForm'

export function ApiClientPage() {
  const [spec, setSpec] = useState<ApiSpec | null>(null)
  const [selected, setSelected] = useState<Endpoint | null>(null)
  const [importText, setImportText] = useState('')
  const [importUrl, setImportUrl] = useState('')
  const [importError, setImportError] = useState<string | null>(null)

  const handleImportText = async () => {
    setImportError(null)
    const result = await parseSpecFromText(importText)
    if (result.ok) setSpec(result.spec)
    else setImportError(result.error)
  }

  const handleImportUrl = async () => {
    setImportError(null)
    const result = await fetchSpec(importUrl)
    if (result.ok) setSpec(result.spec)
    else setImportError(result.error)
  }

  return (
    <div className="h-full flex flex-col">
      <EnvironmentManager />

      {!spec && (
        <div className="p-4 flex flex-col gap-3 max-w-xl">
          <label className="text-sm">
            Import from URL
            <div className="flex gap-2">
              <input
                className="flex-1 border border-slate-300 rounded px-2 py-1"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://api.example.com/openapi.json"
              />
              <button onClick={handleImportUrl} className="px-3 py-1 text-sm rounded bg-slate-800 text-white">Fetch</button>
            </div>
          </label>
          <label className="text-sm">
            Or paste spec (JSON/YAML)
            <textarea
              className="block w-full h-40 border border-slate-300 rounded px-2 py-1 font-mono text-xs"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
          </label>
          <button onClick={handleImportText} className="self-start px-3 py-1 text-sm rounded bg-slate-800 text-white">
            Parse spec
          </button>
          {importError && <div className="text-sm text-red-600">{importError}</div>}
        </div>
      )}

      {spec && (
        <div className="flex-1 grid grid-cols-[280px_1fr] min-h-0">
          <div className="overflow-auto p-3 border-r border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm">{spec.title}</span>
              <button onClick={() => setSpec(null)} className="text-xs text-slate-500">change spec</button>
            </div>
            <EndpointList endpoints={spec.endpoints} onSelect={setSelected} selected={selected} />
          </div>
          <div className="overflow-auto">
            {selected ? <TryItOutForm endpoint={selected} /> : (
              <div className="p-4 text-sm text-slate-500">Select an endpoint from the left.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
