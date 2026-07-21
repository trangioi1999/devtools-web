import { useEffect, useMemo, useState } from 'react'
import Editor from '@monaco-editor/react'
import { Upload } from 'lucide-react'
import type { ApiSpec } from './types'
import { parseSpecFromText } from './specParser'
import { diffApiSpecs, type ChangeKind } from '../../lib/apiSpecDiff'
import { DiffTree } from '../json-viewer/DiffTree'
import { MethodChip } from './EndpointRow'
import { SplitPane } from '../../components/SplitPane'
import { CLASSICAL_THEME, defineClassicalTheme } from '../../lib/monacoTheme'

const LEFT_KEY = 'devtools:api-client:compare-left'
const RIGHT_KEY = 'devtools:api-client:compare-right'

const KIND_BORDER: Record<ChangeKind, string> = {
  added: 'border-added',
  removed: 'border-removed',
  modified: 'border-modified',
}
const KIND_STYLES: Record<ChangeKind, { badge: string; label: string }> = {
  added: { badge: 'text-added', label: '+' },
  removed: { badge: 'text-removed', label: '−' },
  modified: { badge: 'text-modified', label: '~' },
}

const EDITOR_OPTIONS = { automaticLayout: true, minimap: { enabled: false }, fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }

function useParsedSpec(text: string): { spec: ApiSpec | null; error: string | null } {
  const [state, setState] = useState<{ spec: ApiSpec | null; error: string | null }>({ spec: null, error: null })

  useEffect(() => {
    let cancelled = false
    if (!text.trim()) {
      setState({ spec: null, error: null })
      return
    }
    parseSpecFromText(text).then((result) => {
      if (cancelled) return
      setState(result.ok ? { spec: result.spec, error: null } : { spec: null, error: result.error })
    })
    return () => {
      cancelled = true
    }
  }, [text])

  return state
}

function UploadButton({ onLoad }: { onLoad: (text: string) => void }) {
  return (
    <label className="ml-auto btn btn-ghost">
      <Upload size={12} /> Upload
      <input
        type="file"
        accept=".yaml,.yml,.json,application/x-yaml,application/json"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (file) onLoad(await file.text())
          e.target.value = ''
        }}
      />
    </label>
  )
}

export function CompareSpecsView() {
  const [left, setLeft] = useState(() => localStorage.getItem(LEFT_KEY) ?? '')
  const [right, setRight] = useState(() => localStorage.getItem(RIGHT_KEY) ?? '')

  const handleLeft = (v: string | undefined) => {
    const next = v ?? ''
    setLeft(next)
    localStorage.setItem(LEFT_KEY, next)
  }
  const handleRight = (v: string | undefined) => {
    const next = v ?? ''
    setRight(next)
    localStorage.setItem(RIGHT_KEY, next)
  }

  const leftParsed = useParsedSpec(left)
  const rightParsed = useParsedSpec(right)

  const diff = useMemo(() => {
    if (!leftParsed.spec || !rightParsed.spec) return null
    return diffApiSpecs(leftParsed.spec, rightParsed.spec)
  }, [leftParsed.spec, rightParsed.spec])

  const counts = useMemo(() => {
    if (!diff) return null
    const all = [...diff.endpoints, ...diff.models]
    return {
      added: all.filter((c) => c.kind === 'added').length,
      removed: all.filter((c) => c.kind === 'removed').length,
      modified: all.filter((c) => c.kind === 'modified').length,
    }
  }, [diff])

  return (
    <div className="flex-1 min-h-0">
      <SplitPane direction="vertical" initial={45} storageKey="devtools:api-client:compare-split-v">
        <SplitPane direction="horizontal" storageKey="devtools:api-client:compare-split-h">
          <div className="h-full flex flex-col">
            <div className="flex items-center px-3 py-2 border-b border-divider">
              <h6 className="m-0 text-neutral-600">Left</h6>
              <UploadButton onLoad={handleLeft} />
            </div>
            <div className="flex-1 min-h-0">
              <Editor
                language="yaml"
                value={left}
                onChange={handleLeft}
                theme={CLASSICAL_THEME}
                beforeMount={defineClassicalTheme}
                options={EDITOR_OPTIONS}
              />
            </div>
          </div>
          <div className="h-full flex flex-col">
            <div className="flex items-center px-3 py-2 border-b border-divider">
              <h6 className="m-0 text-neutral-600">Right</h6>
              <UploadButton onLoad={handleRight} />
            </div>
            <div className="flex-1 min-h-0">
              <Editor
                language="yaml"
                value={right}
                onChange={handleRight}
                theme={CLASSICAL_THEME}
                beforeMount={defineClassicalTheme}
                options={EDITOR_OPTIONS}
              />
            </div>
          </div>
        </SplitPane>

        <div className="h-full flex flex-col min-h-0">
          {diff && counts && (
            <div className="flex items-center gap-3 px-3 py-2 border-b border-divider text-[13px]">
              <span className="font-semibold text-neutral-600">Differences</span>
              <span className="ml-auto flex items-center gap-2">
                <span className="tag tag-outline" style={{ borderColor: 'var(--color-added)', color: 'var(--color-added)' }}>
                  +{counts.added} added
                </span>
                <span className="tag tag-outline" style={{ borderColor: 'var(--color-removed)', color: 'var(--color-removed)' }}>
                  −{counts.removed} removed
                </span>
                <span className="tag tag-outline" style={{ borderColor: 'var(--color-modified)', color: 'var(--color-modified)' }}>
                  ~{counts.modified} modified
                </span>
              </span>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-auto p-3">
            {!left.trim() || !right.trim() ? (
              <div className="text-sm text-muted">Paste the old spec on the left and the new spec on the right to see what changed.</div>
            ) : (
              <>
                {leftParsed.error && <div className="text-sm text-delete">Left: {leftParsed.error}</div>}
                {rightParsed.error && <div className="text-sm text-delete">Right: {rightParsed.error}</div>}
              </>
            )}

            {diff && (
              <>
                {diff.endpoints.length === 0 && diff.models.length === 0 && (
                  <div className="text-sm text-muted italic">No differences — endpoints and models are identical.</div>
                )}

                {diff.endpoints.length > 0 && (
                  <div className="mb-6">
                    <h6 className="text-neutral-600 mb-2">Endpoints</h6>
                    {diff.endpoints.map((c) => (
                      <div key={`${c.method} ${c.path}`} className={`border-l-2 pl-2 py-1.5 mb-1 ${KIND_BORDER[c.kind]}`}>
                        <div className="flex items-center gap-2">
                          <span className={`font-mono text-xs font-bold ${KIND_STYLES[c.kind].badge}`}>{KIND_STYLES[c.kind].label}</span>
                          <MethodChip method={c.method} />
                          <span className="font-mono text-sm">{c.path}</span>
                        </div>
                        {c.details.length > 0 && (
                          <ul className="mt-1 ml-8 text-xs text-muted list-disc">
                            {c.details.map((d, i) => (
                              <li key={i}>{d}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {diff.models.length > 0 && (
                  <div>
                    <h6 className="text-neutral-600 mb-2">Models</h6>
                    {diff.models.map((m) => (
                      <div key={m.name} className={`border-l-2 pl-2 py-1.5 mb-1 ${KIND_BORDER[m.kind]}`}>
                        <div className="flex items-center gap-2">
                          <span className={`font-mono text-xs font-bold ${KIND_STYLES[m.kind].badge}`}>{KIND_STYLES[m.kind].label}</span>
                          <span className="font-mono text-sm font-semibold">{m.name}</span>
                          <span className="text-xs text-muted">{m.kind}</span>
                        </div>
                        {m.diff && (
                          <div className="mt-1 ml-6">
                            <DiffTree node={m.diff} showUnchanged={false} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </SplitPane>
    </div>
  )
}
