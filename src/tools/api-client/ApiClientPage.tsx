import { useEffect, useMemo, useState } from 'react'
import { FileUp, Globe, Upload } from 'lucide-react'
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

const METHOD_COLOR_VAR: Record<string, string> = {
  GET: 'var(--color-get)',
  POST: 'var(--color-post)',
  PUT: 'var(--color-put)',
  PATCH: 'var(--color-patch)',
  DELETE: 'var(--color-delete)',
}

function methodAbbrev(method: string): string {
  return method === 'DELETE' ? 'DEL' : method
}

function endpointId(e: Endpoint): string {
  return `ep-${e.method}-${e.path}`.replace(/[^a-zA-Z0-9-]/g, '-')
}

function TagSection({ tag, endpoints, models }: { tag: string; endpoints: Endpoint[]; models?: ApiModel[] }) {
  return (
    <div className="mb-6">
      <h3 className="mb-3">{tag}</h3>
      {endpoints.map((e) => (
        <div key={`${e.method} ${e.path}`} id={endpointId(e)}>
          <EndpointRow endpoint={e} models={models} />
        </div>
      ))}
    </div>
  )
}

function TocLink({
  endpoint,
  active,
  onClick,
}: {
  endpoint: Endpoint
  active: boolean
  onClick: () => void
}) {
  return (
    <a
      href={`#${endpointId(endpoint)}`}
      onClick={onClick}
      className="flex items-center gap-2 no-underline px-1.5 py-1 rounded-sm"
      style={{ background: active ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)' : undefined }}
      onMouseEnter={(ev) => {
        if (!active) ev.currentTarget.style.background = 'color-mix(in srgb, var(--color-text) 6%, transparent)'
      }}
      onMouseLeave={(ev) => {
        if (!active) ev.currentTarget.style.background = ''
      }}
    >
      <span
        className="font-semibold shrink-0"
        style={{ color: METHOD_COLOR_VAR[endpoint.method] ?? 'var(--color-accent-700)', width: 34, fontSize: 10, letterSpacing: '0.05em' }}
      >
        {methodAbbrev(endpoint.method)}
      </span>
      <span className="text-text truncate">{endpoint.path}</span>
    </a>
  )
}

export function ApiClientPage() {
  const [subTab, setSubTab] = useState<SubTab>('docs')
  const [spec, setSpec] = useState<ApiSpec | null>(null)
  const [importText, setImportText] = useState('')
  const [importUrl, setImportUrl] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [tocFilter, setTocFilter] = useState('')
  const [exportFormat, setExportFormat] = useState<'models' | 'endpoints' | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [activeEndpointId, setActiveEndpointId] = useState<string | null>(null)

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

  const tocGrouped = useMemo(() => {
    if (!spec) return []
    const q = tocFilter.trim().toLowerCase()
    const filtered = q ? spec.endpoints.filter((e) => e.path.toLowerCase().includes(q) || e.tag.toLowerCase().includes(q)) : spec.endpoints
    const byTag = new Map<string, Endpoint[]>()
    for (const e of filtered) {
      const list = byTag.get(e.tag) ?? []
      list.push(e)
      byTag.set(e.tag, list)
    }
    return [...byTag.entries()]
  }, [spec, tocFilter])

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(t)
  }, [copied])

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 border-b border-divider px-4 py-2">
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
          {spec && (
            <div className="flex items-center gap-3 border-b border-divider px-4 py-2 flex-wrap">
              <EnvironmentManager />
              <div className="ml-auto flex items-center gap-2 relative">
                <div className="relative">
                  <button type="button" onClick={() => setExportOpen((v) => !v)} className="btn btn-primary" style={{ minHeight: 32, padding: '4px 16px' }}>
                    Export ▾
                  </button>
                  {exportOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-surface border border-divider rounded-md shadow-md z-10 w-56 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          setExportFormat('models')
                          setExportOpen(false)
                        }}
                        className="block w-full text-left px-3 py-2 text-sm hover:bg-neutral-100"
                      >
                        TypeScript models
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setExportFormat('endpoints')
                          setExportOpen(false)
                        }}
                        className="block w-full text-left px-3 py-2 text-sm hover:bg-neutral-100"
                      >
                        createEndpoints(basePath)
                      </button>
                    </div>
                  )}
                </div>
                <button type="button" onClick={handleChangeSpec} className="btn btn-ghost">Change spec</button>
              </div>
            </div>
          )}

          {!spec && (
            <div className="flex-1 overflow-auto">
              <div style={{ maxWidth: 620, margin: '0 auto', padding: '36.8px 18.4px' }}>
                <div className="text-center mb-6">
                  <div className="text-[10px] tracking-[0.14em] uppercase text-accent mb-2">API Client</div>
                  <h2 className="mb-2">Import an OpenAPI spec</h2>
                  <p className="text-muted italic m-0">
                    Swagger-style docs, try-it-out, TypeScript exports, and spec comparison — all from one YAML/JSON file.
                  </p>
                </div>

                <label
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    handleFileUpload(e.dataTransfer.files?.[0])
                  }}
                  className="flex flex-col items-center justify-center gap-2 rounded-md py-8 px-4 cursor-pointer transition-colors"
                  style={{ border: '1px dashed var(--color-neutral-400)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-accent)'
                    e.currentTarget.style.background = 'color-mix(in srgb, var(--color-accent) 5%, transparent)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-neutral-400)'
                    e.currentTarget.style.background = ''
                  }}
                >
                  <FileUp size={28} strokeWidth={1.5} className="text-accent" />
                  <div className="font-heading font-semibold text-base">Drop your spec here, or click to browse</div>
                  <div className="text-muted text-xs font-mono">.yaml · .yml · .json</div>
                  <input
                    type="file"
                    accept=".yaml,.yml,.json,application/x-yaml,application/json"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files?.[0])}
                  />
                </label>

                <div className="flex items-center gap-3 my-4 text-[11px] tracking-[0.1em] uppercase text-neutral-500">
                  <div className="flex-1 h-px bg-divider" />
                  or
                  <div className="flex-1 h-px bg-divider" />
                </div>

                <div className="card" style={{ gap: '18.4px' }}>
                  <label className="field">
                    <label className="flex items-center gap-1.5"><Globe size={14} className="text-neutral-400" /> Import from URL</label>
                    <div className="flex gap-2">
                      <input
                        className="input font-mono text-xs"
                        value={importUrl}
                        onChange={(e) => setImportUrl(e.target.value)}
                        placeholder="https://api.example.com/openapi.json"
                      />
                      <button type="button" onClick={handleImportUrl} className="btn btn-primary">Fetch</button>
                    </div>
                  </label>
                  <label className="field">
                    <label className="flex items-center gap-1.5"><Upload size={14} className="text-neutral-400" /> Paste spec (JSON/YAML)</label>
                    <textarea
                      className="input font-mono text-xs"
                      style={{ height: 144 }}
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      placeholder={'openapi: 3.0.0\ninfo:\n  title: My API'}
                    />
                    <button type="button" onClick={handleImportText} className="btn btn-primary" style={{ marginTop: '9.2px' }}>
                      Parse spec
                    </button>
                  </label>
                  {importError && <div className="text-sm text-delete">{importError}</div>}
                </div>
              </div>
            </div>
          )}

          {spec && (
            <div className="flex-1 min-h-0 flex">
              <aside className="hidden lg:flex flex-col w-[250px] shrink-0 border-r border-divider overflow-auto px-3 py-4">
                <h6 className="text-neutral-600">Contents</h6>
                <input
                  placeholder="Filter endpoints…"
                  value={tocFilter}
                  onChange={(e) => setTocFilter(e.target.value)}
                  className="input mb-3"
                  style={{ minHeight: 32 }}
                />
                <div className="flex flex-col gap-0.5 font-mono text-xs">
                  {tocGrouped.map(([tag, endpoints]) => (
                    <div key={tag}>
                      <div className="font-heading font-semibold text-[15px]" style={{ padding: '6px 0 2px' }}>
                        {tag} <span className="text-muted text-[11px] font-body">· {endpoints.length}</span>
                      </div>
                      {endpoints.map((e) => (
                        <TocLink
                          key={`${e.method} ${e.path}`}
                          endpoint={e}
                          active={activeEndpointId === endpointId(e)}
                          onClick={() => setActiveEndpointId(endpointId(e))}
                        />
                      ))}
                    </div>
                  ))}
                  {(spec.models?.length ?? 0) > 0 && (
                    <div>
                      <div className="font-heading font-semibold text-[15px]" style={{ padding: '10px 0 2px' }}>
                        Schemas <span className="text-muted text-[11px] font-body">· {spec.models?.length}</span>
                      </div>
                      {spec.models?.map((m) => (
                        <a key={m.name} href={`#model-${m.name}`} className="px-1.5 py-1 text-text no-underline hover:text-accent">
                          {m.name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </aside>

              <div className="flex-1 min-w-0 overflow-auto">
                <div style={{ maxWidth: 840, margin: '0 auto', padding: '27.6px 27.6px 36.8px' }}>
                  <div className="flex items-baseline gap-3">
                    <h2 className="m-0">{spec.title}</h2>
                    {spec.version && (
                      <span className="tag tag-outline font-mono tnum">{spec.version}</span>
                    )}
                  </div>
                  {spec.description && <p className="text-muted italic" style={{ margin: '9.2px 0' }}>{spec.description}</p>}
                  {(spec.servers?.length ?? 0) > 0 && (
                    <div className="font-mono text-xs text-neutral-600">{spec.servers?.join(' · ')}</div>
                  )}
                  <hr className="hr" />

                  <input
                    placeholder="Filter by path, tag, operationId…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input mb-4 lg:hidden"
                  />

                  {grouped.map(([tag, endpoints]) => (
                    <TagSection key={tag} tag={tag} endpoints={endpoints} models={spec.models} />
                  ))}
                  {grouped.length === 0 && <div className="text-sm text-muted">No endpoints match the filter.</div>}

                  <ModelsSection models={spec.models ?? []} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {exportFormat && spec && (
        <ExportSpecModal spec={spec} format={exportFormat} onClose={() => setExportFormat(null)} onCopied={() => setCopied(true)} />
      )}
      {copied && <div className="fixed bottom-4 right-4 toast z-20">Copied</div>}
    </div>
  )
}
