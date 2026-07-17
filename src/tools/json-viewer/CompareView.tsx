import { useMemo, useState } from 'react'
import Editor from '@monaco-editor/react'
import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react'
import { computeDiffTree, countDiffs } from './diff'
import { DiffTree } from './DiffTree'
import { SplitPane } from '../../components/SplitPane'
import { parseJsonStrict } from '../../lib/jsonAutoFix'

const LEFT_KEY = 'devtools:json-viewer:compare-left'
const RIGHT_KEY = 'devtools:json-viewer:compare-right'
const DEFAULT_LEFT = '{\n  "a": 1\n}'
const DEFAULT_RIGHT = '{\n  "a": 2\n}'

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
          <Editor language="json" value={left} onChange={handleLeftChange} options={{ minimap: { enabled: false }, fontSize: 13 }} />
          <Editor language="json" value={right} onChange={handleRightChange} options={{ minimap: { enabled: false }, fontSize: 13 }} />
        </SplitPane>
        <div className="h-full flex flex-col min-h-0">
          <div className="flex items-center gap-3 px-3 py-1.5 border-b border-slate-200 text-sm">
            <label className="flex items-center gap-1.5 text-slate-700 select-none">
              <input type="checkbox" checked={onlyDifferences} onChange={(e) => setOnlyDifferences(e.target.checked)} />
              Only differences
            </label>
            <button
              type="button"
              onClick={() => setExpandAllSignal((n) => n + 1)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-slate-600 hover:bg-slate-100"
              title="Expand all"
            >
              <ChevronsUpDown size={14} /> Expand all
            </button>
            <button
              type="button"
              onClick={() => setCollapseAllSignal((n) => n + 1)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-slate-600 hover:bg-slate-100"
              title="Collapse all"
            >
              <ChevronsDownUp size={14} /> Collapse all
            </button>
            {counts && (
              <span className="ml-auto flex items-center gap-2 text-xs">
                <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-800">+{counts.added} added</span>
                <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800">−{counts.removed} removed</span>
                <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800">~{counts.modified} modified</span>
              </span>
            )}
          </div>
          <div className="flex-1 overflow-auto p-3">
            {!leftParsed.ok && <div className="text-sm text-red-600">Left: invalid JSON — {leftParsed.errors[0]?.message}</div>}
            {!rightParsed.ok && <div className="text-sm text-red-600">Right: invalid JSON — {rightParsed.errors[0]?.message}</div>}
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
