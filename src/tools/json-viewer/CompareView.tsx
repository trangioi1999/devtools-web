import { useMemo, useState } from 'react'
import Editor from '@monaco-editor/react'
import { computeDiffTree } from './diff'
import { DiffTree } from './DiffTree'
import { parseJsonStrict } from '../../lib/jsonAutoFix'

const LEFT_KEY = 'devtools:json-viewer:compare-left'
const RIGHT_KEY = 'devtools:json-viewer:compare-right'
const DEFAULT_LEFT = '{\n  "a": 1\n}'
const DEFAULT_RIGHT = '{\n  "a": 2\n}'

export function CompareView() {
  const [left, setLeft] = useState(() => localStorage.getItem(LEFT_KEY) ?? DEFAULT_LEFT)
  const [right, setRight] = useState(() => localStorage.getItem(RIGHT_KEY) ?? DEFAULT_RIGHT)

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

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 grid grid-cols-2 min-h-0 border-b border-slate-200">
        <Editor language="json" value={left} onChange={handleLeftChange} options={{ minimap: { enabled: false }, fontSize: 13 }} />
        <Editor language="json" value={right} onChange={handleRightChange} options={{ minimap: { enabled: false }, fontSize: 13 }} />
      </div>
      <div className="flex-1 overflow-auto p-3">
        {!leftParsed.ok && <div className="text-sm text-red-600">Left: invalid JSON — {leftParsed.errors[0]?.message}</div>}
        {!rightParsed.ok && <div className="text-sm text-red-600">Right: invalid JSON — {rightParsed.errors[0]?.message}</div>}
        {diffTree && <DiffTree node={diffTree} />}
      </div>
    </div>
  )
}
