import { useEffect, useMemo, useState } from 'react'
import Editor from '@monaco-editor/react'
import type { ApiSpec } from './types'
import { parseSpecFromText } from './specParser'
import { diffApiSpecs, type ChangeKind } from '../../lib/apiSpecDiff'
import { DiffTree } from '../json-viewer/DiffTree'
import { MethodChip } from './EndpointRow'
import { SplitPane } from '../../components/SplitPane'

const LEFT_KEY = 'devtools:api-client:compare-left'
const RIGHT_KEY = 'devtools:api-client:compare-right'

const KIND_STYLES: Record<ChangeKind, { row: string; badge: string; label: string }> = {
  added: { row: 'bg-green-50', badge: 'text-green-700', label: '+' },
  removed: { row: 'bg-red-50', badge: 'text-red-700', label: '−' },
  modified: { row: 'bg-yellow-50', badge: 'text-yellow-700', label: '~' },
}

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
            <div className="px-3 py-1 text-xs text-slate-500 border-b border-slate-200">Old spec (YAML/JSON)</div>
            <Editor language="yaml" value={left} onChange={handleLeft} options={{ minimap: { enabled: false }, fontSize: 13 }} />
          </div>
          <div className="h-full flex flex-col">
            <div className="px-3 py-1 text-xs text-slate-500 border-b border-slate-200">New spec (YAML/JSON)</div>
            <Editor language="yaml" value={right} onChange={handleRight} options={{ minimap: { enabled: false }, fontSize: 13 }} />
          </div>
        </SplitPane>

        <div className="h-full overflow-auto p-3">
          {!left.trim() || !right.trim() ? (
            <div className="text-sm text-slate-500">Paste the old spec on the left and the new spec on the right to see what changed.</div>
          ) : (
            <>
              {leftParsed.error && <div className="text-sm text-red-600">Left: {leftParsed.error}</div>}
              {rightParsed.error && <div className="text-sm text-red-600">Right: {rightParsed.error}</div>}
            </>
          )}

          {diff && counts && (
            <>
              <div className="flex items-center gap-2 text-xs mb-3">
                <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-800">+{counts.added} added</span>
                <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800">−{counts.removed} removed</span>
                <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800">~{counts.modified} modified</span>
              </div>

              {diff.endpoints.length === 0 && diff.models.length === 0 && (
                <div className="text-sm text-slate-500 italic">No differences — endpoints and models are identical.</div>
              )}

              {diff.endpoints.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-1">Endpoints</h3>
                  {diff.endpoints.map((c) => (
                    <div key={`${c.method} ${c.path}`} className={`rounded px-2 py-1.5 mb-1 ${KIND_STYLES[c.kind].row}`}>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-xs font-bold ${KIND_STYLES[c.kind].badge}`}>{KIND_STYLES[c.kind].label}</span>
                        <MethodChip method={c.method} />
                        <span className="font-mono text-sm">{c.path}</span>
                      </div>
                      {c.details.length > 0 && (
                        <ul className="mt-1 ml-8 text-xs text-slate-600 list-disc">
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
                  <h3 className="text-sm font-semibold text-slate-700 mb-1">Models</h3>
                  {diff.models.map((m) => (
                    <div key={m.name} className={`rounded px-2 py-1.5 mb-1 ${KIND_STYLES[m.kind].row}`}>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-xs font-bold ${KIND_STYLES[m.kind].badge}`}>{KIND_STYLES[m.kind].label}</span>
                        <span className="font-mono text-sm font-semibold">{m.name}</span>
                        <span className="text-xs text-slate-500">{m.kind}</span>
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
      </SplitPane>
    </div>
  )
}
