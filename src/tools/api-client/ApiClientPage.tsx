import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Download, FileUp, Globe, Upload } from 'lucide-react'
import type { ApiModel, ApiSpec, Endpoint } from './types'
import { parseSpecFromText, fetchSpec } from './specParser'
import { EnvironmentManager } from './EnvironmentManager'
import { EndpointRow } from './EndpointRow'
import { ModelsSection } from './ModelsSection'
import { ExportSpecModal } from './ExportSpecModal'
import { CompareSpecsView } from './CompareSpecsView'
import { SubTabs } from '../../components/SubTabs'

const SPEC_KEY = 'devtools:api-client:spec'

type SubTab = 'docs' | 'compare'

function TagSection({ tag, endpoints, models }: { tag: string; endpoints: Endpoint[]; models?: ApiModel[] }) {
  const [open, setOpen] = useState(true)

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full text-left text-sm font-semibold text-slate-800 border-b border-slate-200 pb-1 mb-2"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {tag}
        <span className="text-slate-400 font-normal">({endpoints.length})</span>
      </button>
      {open && endpoints.map((e) => <EndpointRow key={`${e.method} ${e.path}`} endpoint={e} models={models} />)}
    </div>
  )
}

export function ApiClientPage() {
  const [subTab, setSubTab] = useState<SubTab>('docs')
  const [spec, setSpec] = useState<ApiSpec | null>(null)
  const [importText, setImportText] = useState('')
  const [importUrl, setImportUrl] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [exportFormat, setExportFormat] = useState<'models' | 'endpoints' | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  // Restore the last parsed spec across reloads.
  useEffect(() => {
    const saved = localStorage.getItem(SPEC_KEY)
    if (!saved) return
    parseSpecFromText(saved).then((result) => {
      if (result.ok) {
        setSpec(result.spec)
        setImportText(saved)
      }
    })
  }, [])

  const applySpec = (text: string, parsed: ApiSpec) => {
    setSpec(parsed)
    localStorage.setItem(SPEC_KEY, text)
  }

  const handleImportText = async () => {
    setImportError(null)
    const result = await parseSpecFromText(importText)
    if (result.ok) applySpec(importText, result.spec)
    else setImportError(result.error)
  }

  const handleFileUpload = async (file: File | undefined) => {
    if (!file) return
    setImportError(null)
    const text = await file.text()
    setImportText(text)
    const result = await parseSpecFromText(text)
    if (result.ok) applySpec(text, result.spec)
    else setImportError(result.error)
  }

  const handleImportUrl = async () => {
    setImportError(null)
    const result = await fetchSpec(importUrl)
    if (result.ok) {
      setSpec(result.spec)
      // keep url-fetched spec available offline too
      localStorage.setItem(SPEC_KEY, importText)
    } else setImportError(result.error)
  }

  const handleChangeSpec = () => {
    setSpec(null)
    localStorage.removeItem(SPEC_KEY)
  }

  const grouped = useMemo(() => {
    if (!spec) return []
    const q = search.trim().toLowerCase()
    const filtered = q
      ? spec.endpoints.filter(
          (e) =>
            e.path.toLowerCase().includes(q) ||
            e.tag.toLowerCase().includes(q) ||
            (e.operationId ?? '').toLowerCase().includes(q) ||
            (e.summary ?? '').toLowerCase().includes(q),
        )
      : spec.endpoints
    const byTag = new Map<string, Endpoint[]>()
    for (const e of filtered) {
      const list = byTag.get(e.tag) ?? []
      list.push(e)
      byTag.set(e.tag, list)
    }
    return [...byTag.entries()]
  }, [spec, search])

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(t)
  }, [copied])

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-1.5 bg-slate-50">
        <SubTabs
          tabs={[
            { id: 'docs', label: 'Docs' },
            { id: 'compare', label: 'Compare' },
          ]}
          active={subTab}
          onChange={setSubTab}
        />
      </div>

      {subTab === 'compare' ? (
        <CompareSpecsView />
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <EnvironmentManager />

          {!spec && (
            <div className="flex-1 overflow-auto bg-slate-50">
              <div className="max-w-2xl mx-auto px-6 py-10">
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold text-slate-900">Import an OpenAPI spec</h1>
                  <p className="text-sm text-slate-500 mt-1">
                    Swagger-style docs, try-it-out, TypeScript exports, and spec comparison — all from one YAML/JSON file.
                  </p>
                </div>

                <label
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    handleFileUpload(e.dataTransfer.files?.[0])
                  }}
                  className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl bg-white py-10 cursor-pointer hover:border-sky-400 hover:bg-sky-50/40 transition-colors"
                >
                  <div className="w-11 h-11 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">
                    <FileUp size={20} />
                  </div>
                  <div className="text-sm font-medium text-slate-700">Drop your spec here, or click to browse</div>
                  <div className="text-xs text-slate-400">.yaml · .yml · .json</div>
                  <input
                    type="file"
                    accept=".yaml,.yml,.json,application/x-yaml,application/json"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files?.[0])}
                  />
                </label>

                <div className="flex items-center gap-3 my-5 text-xs text-slate-400">
                  <div className="flex-1 h-px bg-slate-200" />
                  or
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-4 shadow-sm">
                  <label className="text-sm font-medium text-slate-700">
                    <span className="flex items-center gap-1.5 mb-1"><Globe size={14} className="text-slate-400" /> Import from URL</span>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
                        value={importUrl}
                        onChange={(e) => setImportUrl(e.target.value)}
                        placeholder="https://api.example.com/openapi.json"
                      />
                      <button onClick={handleImportUrl} className="px-4 py-1.5 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-700">Fetch</button>
                    </div>
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    <span className="flex items-center gap-1.5 mb-1"><Upload size={14} className="text-slate-400" /> Paste spec (JSON/YAML)</span>
                    <textarea
                      className="block w-full h-36 border border-slate-300 rounded-lg px-3 py-2 font-mono text-xs font-normal focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      placeholder="openapi: 3.0.0&#10;info:&#10;  title: My API"
                    />
                    <button onClick={handleImportText} className="mt-2 px-4 py-1.5 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-700">
                      Parse spec
                    </button>
                  </label>
                  {importError && <div className="text-sm text-red-600">{importError}</div>}
                </div>
              </div>
            </div>
          )}

          {spec && (
            <div className="flex-1 overflow-auto">
              <div className="max-w-4xl mx-auto px-4 py-4">
                <div className="flex items-start gap-3 mb-1">
                  <h1 className="text-xl font-bold text-slate-900">{spec.title}</h1>
                  {spec.version && (
                    <span className="mt-1 text-xs bg-slate-200 text-slate-700 rounded px-1.5 py-0.5 font-mono">{spec.version}</span>
                  )}
                  <div className="ml-auto flex items-center gap-2 relative">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setExportOpen((v) => !v)}
                        className="flex items-center gap-1 px-3 py-1 text-sm rounded bg-slate-800 text-white"
                      >
                        <Download size={14} /> Export <ChevronDown size={12} />
                      </button>
                      {exportOpen && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded shadow-lg z-10 w-56">
                          <button
                            type="button"
                            onClick={() => {
                              setExportFormat('models')
                              setExportOpen(false)
                            }}
                            className="block w-full text-left px-3 py-1.5 text-sm hover:bg-slate-100"
                          >
                            TypeScript models
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setExportFormat('endpoints')
                              setExportOpen(false)
                            }}
                            className="block w-full text-left px-3 py-1.5 text-sm hover:bg-slate-100"
                          >
                            createEndpoints(basePath)
                          </button>
                        </div>
                      )}
                    </div>
                    <button onClick={handleChangeSpec} className="text-xs text-slate-500 hover:underline">change spec</button>
                  </div>
                </div>
                {spec.description && <p className="text-sm text-slate-600 mb-2">{spec.description}</p>}
                {(spec.servers?.length ?? 0) > 0 && (
                  <div className="text-xs text-slate-500 font-mono mb-3">Servers: {spec.servers?.join(' · ')}</div>
                )}

                <input
                  placeholder="Filter by path, tag, operationId…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded mb-4"
                />

                {grouped.map(([tag, endpoints]) => (
                  <TagSection key={tag} tag={tag} endpoints={endpoints} models={spec.models} />
                ))}
                {grouped.length === 0 && <div className="text-sm text-slate-500">No endpoints match the filter.</div>}

                <ModelsSection models={spec.models ?? []} />
              </div>
            </div>
          )}
        </div>
      )}

      {exportFormat && spec && (
        <ExportSpecModal spec={spec} format={exportFormat} onClose={() => setExportFormat(null)} onCopied={() => setCopied(true)} />
      )}
      {copied && (
        <div className="fixed bottom-4 right-4 bg-slate-800 text-white text-sm px-3 py-1.5 rounded shadow-lg z-20">Copied</div>
      )}
    </div>
  )
}
