import { useState } from 'react'
import { Handle, Position, useUpdateNodeInternals, type NodeProps } from '@xyflow/react'
import { Maximize2, Minimize2 } from 'lucide-react'
import type { GraphNodeRow } from '../../lib/jsonGraphLayout'
import { matchesText } from '../../lib/jsonSearch'
import { valueClassName } from '../../lib/jsonValueStyle'

interface GraphCardProps {
  rows: GraphNodeRow[]
  onCopyPath: (path: string) => void
  onCopyValue: (value: unknown) => void
  onFocusNode: (id: string) => void
  search: string
  focused: boolean
}

const LONG_VALUE_THRESHOLD = 28

export function GraphCard(props: NodeProps) {
  const { rows, onCopyPath, onCopyValue, onFocusNode, search, focused } = props.data as unknown as GraphCardProps
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const updateNodeInternals = useUpdateNodeInternals()

  const toggleRow = (path: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
    // Row height changes move the per-row handles — tell React Flow to re-measure.
    requestAnimationFrame(() => updateNodeInternals(props.id))
  }

  return (
    <div
      className={`rounded border bg-white shadow-sm text-xs font-mono min-w-[200px] max-w-[280px] ${
        focused ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-300'
      }`}
    >
      {rows.map((row) => {
        const isContainer = row.kind !== 'primitive'
        const valueText = isContainer ? '' : JSON.stringify(row.value)
        const isLong = valueText.length > LONG_VALUE_THRESHOLD
        const isExpanded = expandedRows.has(row.path)

        return (
          <div key={row.key} className="relative flex items-start gap-2 px-2 py-1 border-b border-slate-100 last:border-b-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onCopyPath(row.path)
              }}
              title={`Copy path: ${row.path}`}
              className={`hover:underline shrink-0 ${isContainer ? 'font-semibold text-blue-800' : 'text-blue-600'} ${
                matchesText(row.key, search) ? 'bg-yellow-200' : ''
              }`}
            >
              {row.key}
            </button>
            {row.kind === 'primitive' ? (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCopyValue(row.value)
                  }}
                  title={isExpanded ? 'Copy value' : valueText}
                  className={`ml-auto text-right hover:underline ${valueClassName(row.value)} ${
                    isExpanded ? 'whitespace-pre-wrap break-all' : 'truncate max-w-[150px]'
                  } ${matchesText(valueText, search) ? 'bg-yellow-200' : ''}`}
                >
                  {valueText}
                </button>
                {isLong && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleRow(row.path)
                    }}
                    title={isExpanded ? 'Collapse value' : 'Show full value'}
                    className="shrink-0 text-slate-400 hover:text-slate-700 mt-0.5"
                  >
                    {isExpanded ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (row.childId) onFocusNode(row.childId)
                  }}
                  title={`Focus ${row.kind === 'array' ? `array [${row.count}]` : `object {${row.count}}`} — click to show only this branch`}
                  className={`ml-auto font-semibold ${
                    row.kind === 'array' ? 'text-orange-500 hover:text-orange-700' : 'text-sky-500 hover:text-sky-700'
                  }`}
                >
                  {row.kind === 'array' ? `[${row.count}]` : `{${row.count}}`}
                </button>
                {row.childId && (
                  <Handle
                    type="source"
                    id={row.path}
                    position={Position.Right}
                    className="!absolute !right-0 !top-1/2 !-translate-y-1/2 !w-2 !h-2 !bg-slate-400"
                  />
                )}
              </>
            )}
          </div>
        )
      })}
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-slate-400" />
    </div>
  )
}
