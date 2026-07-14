import type { DiffNode, DiffStatus } from './diff'

const STATUS_CLASSES: Record<DiffStatus, string> = {
  unchanged: '',
  added: 'bg-green-50 text-green-800',
  removed: 'bg-red-50 text-red-800 line-through',
  modified: 'bg-yellow-50 text-yellow-800',
}

function formatValue(value: unknown): string {
  return JSON.stringify(value)
}

function Node({ node }: { node: DiffNode }) {
  const rowClass = `ml-3 flex items-center gap-1 ${STATUS_CLASSES[node.status]}`

  if (node.children) {
    return (
      <div>
        <div className={rowClass}>
          <span className="font-mono text-sm font-semibold text-blue-700">{node.key}</span>
          <span className="text-slate-400 text-xs">{`{${node.children.length}}`}</span>
        </div>
        <div className="border-l border-slate-200 pl-2">
          {node.children.map((child) => (
            <Node key={String(child.key)} node={child} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={rowClass}>
      <span className="font-mono text-sm text-blue-700">{node.key}</span>
      <span className="text-slate-400 text-sm">:</span>
      {node.status === 'modified' ? (
        <>
          <span className="font-mono text-sm line-through text-red-700">{formatValue(node.oldValue)}</span>
          <span className="text-slate-400 text-xs">→</span>
          <span className="font-mono text-sm text-green-700">{formatValue(node.value)}</span>
        </>
      ) : (
        <span className="font-mono text-sm">{formatValue(node.status === 'removed' ? node.oldValue : node.value)}</span>
      )}
    </div>
  )
}

export function DiffTree({ node }: { node: DiffNode }) {
  if (!node.children) {
    return <Node node={node} />
  }

  return (
    <div className="text-sm">
      {node.children.map((child) => (
        <Node key={String(child.key)} node={child} />
      ))}
    </div>
  )
}
