import { useMemo, useState } from 'react'
import Editor from '@monaco-editor/react'
import { computeDiffTree, countDiffs } from './diff'
import { DiffTree } from './DiffTree'
import { SplitPane } from '../../components/SplitPane'
import { parseJsonStrict } from '../../lib/jsonAutoFix'
import { CLASSICAL_THEME, defineClassicalTheme } from '../../lib/monacoTheme'

const LEFT_KEY = 'devtools:json-viewer:compare-left'
const RIGHT_KEY = 'devtools:json-viewer:compare-right'
const DEFAULT_LEFT = '{\n  "a": 1\n}'
const DEFAULT_RIGHT = '{\n  "a": 2\n}'

const EDITOR_OPTIONS = { automaticLayout: true, minimap: { enabled: false }, fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }

export function CompareView() {
  const [left, setLeft] = useState(() => localStorage.getItem(LEFT_KEY) ?? DEFAULT_LEFT)
  const [right, setRight] = useState(() => localStorage.getItem(RIGHT_KEY) ?? DEFAULT_RIGHT)
  const [onlyDifferences, setOnlyDifferences] = useState(true)
  const [expandAllSignal, setExpandAllSignal] = useState(0)
  const [collapseAllSignal, setCollapseAllSignal] = useState(0)

  const handleLeftChange = (value: string | undefined) => {
    const next = value ?? ''
    setLeft(next)
    localStorage.setItem(LEFT_KEY, next)
  }

  const handleRightChange = (value: string | undefined) => {
    const next = value ?? ''
    setRight(next)
    localStorage.setItem(RIGHT_KEY, next)
  }

  const leftParsed = useMemo(() => parseJsonStrict(left), [left])
  const rightParsed = useMemo(() => parseJsonStrict(right), [right])

  const diffTree = useMemo(() => {
    if (!leftParsed.ok || !rightParsed.ok) return null
    return computeDiffTree(leftParsed.value, rightParsed.value)
  }, [leftParsed, rightParsed])

  const counts = useMemo(() => (diffTree ? countDiffs(diffTree) : null), [diffTree])

  return (
    <div className="flex-1 min-h-0">
      <SplitPane direction="vertical" initial={45} storageKey="devtools:json-viewer:compare-split-v">
        <SplitPane direction="horizontal" storageKey="devtools:json-viewer:compare-split-h">
          <div className="h-full flex flex-col">
            <h6 className="m-0 px-3 py-2 border-b border-divider text-neutral-600">Left</h6>
            <div className="flex-1 min-h-0">
              <Editor
                language="json"
                value={left}
                onChange={handleLeftChange}
                theme={CLASSICAL_THEME}
                beforeMount={defineClassicalTheme}
                options={EDITOR_OPTIONS}
              />
            </div>
          </div>
          <div className="h-full flex flex-col">
            <h6 className="m-0 px-3 py-2 border-b border-divider text-neutral-600">Right</h6>
            <div className="flex-1 min-h-0">
              <Editor
                language="json"
                value={right}
                onChange={handleRightChange}
                theme={CLASSICAL_THEME}
                beforeMount={defineClassicalTheme}
                options={EDITOR_OPTIONS}
              />
            </div>
          </div>
        </SplitPane>
        <div className="h-full flex flex-col min-h-0">
          <div className="flex items-center gap-3 px-3 py-2 border-b border-divider text-[13px]">
            <label className="radio">
              <input type="checkbox" checked={onlyDifferences} onChange={(e) => setOnlyDifferences(e.target.checked)} />
              <span className="dot rounded-[2px]" />
              Only differences
            </label>
            <button type="button" onClick={() => setExpandAllSignal((n) => n + 1)} className="btn btn-ghost">
              Expand all
            </button>
            <button type="button" onClick={() => setCollapseAllSignal((n) => n + 1)} className="btn btn-ghost">
              Collapse all
            </button>
            {counts && (
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
            )}
          </div>
          <div className="flex-1 overflow-auto p-3">
            {!leftParsed.ok && <div className="text-sm text-delete">Left: invalid JSON — {leftParsed.errors[0]?.message}</div>}
            {!rightParsed.ok && <div className="text-sm text-delete">Right: invalid JSON — {rightParsed.errors[0]?.message}</div>}
            {diffTree && (
              <DiffTree
                node={diffTree}
                showUnchanged={!onlyDifferences}
                expandAllSignal={expandAllSignal}
                collapseAllSignal={collapseAllSignal}
              />
            )}
          </div>
        </div>
      </SplitPane>
    </div>
  )
}
