import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { GraphNodeRow } from '../../lib/jsonGraphLayout'
import { matchesText } from '../../lib/jsonSearch'

interface GraphCardProps {
  rows: GraphNodeRow[]
  onCopyPath: (path: string) => void
  onCopyValue: (value: unknown) => void
  onFocusNode: (id: string) => void
  search: string
}

export function GraphCard(props: NodeProps) {
  const { rows, onCopyPath, onCopyValue, onFocusNode, search } = props.data as unknown as GraphCardProps

  return (
    <div className="rounded border border-slate-300 bg-white shadow-sm text-xs font-mono min-w-[200px]">
      {rows.map((row) => (
        <div key={row.key} className="flex items-center gap-2 px-2 py-1 border-b border-slate-100 last:border-b-0">
          <button
            type="button"
            onClick={() => onCopyPath(row.path)}
            className={`text-blue-700 hover:underline ${matchesText(row.key, search) ? 'bg-yellow-200' : ''}`}
          >
            {row.key}
          </button>
          {row.kind === 'primitive' ? (
            <button
              type="button"
              onClick={() => onCopyValue(row.value)}
              className={`text-emerald-700 ml-auto truncate max-w-[100px] hover:underline ${
                matchesText(JSON.stringify(row.value), search) ? 'bg-yellow-200' : ''
              }`}
            >
              {JSON.stringify(row.value)}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => row.childId && onFocusNode(row.childId)}
              className="text-slate-400 ml-auto hover:text-slate-700"
            >
              {row.kind === 'array' ? `[${row.count}]` : `{${row.count}}`}
            </button>
          )}
        </div>
      ))}
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  )
}
