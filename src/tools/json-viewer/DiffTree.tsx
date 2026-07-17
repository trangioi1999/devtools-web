import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { DiffNode, DiffStatus } from './diff'
import { valueClassName } from '../../lib/jsonValueStyle'

const STATUS_CLASSES: Record<DiffStatus, string> = {
  unchanged: '',
  added: 'bg-green-50',
  removed: 'bg-red-50',
  modified: 'bg-yellow-50',
}

const STATUS_BADGES: Record<Exclude<DiffStatus, 'unchanged'>, { label: string; className: string }> = {
  added: { label: '+', className: 'text-green-700' },
  removed: { label: '−', className: 'text-red-700' },
  modified: { label: '~', className: 'text-yellow-700' },
}

function formatValue(value: unknown): string {
  return JSON.stringify(value)
}

function nodePath(parent: string, key: string | number): string {
  return `${parent}/${String(key)}`
}

function collectContainerPaths(node: DiffNode, parent: string, out: string[]): void {
  const path = nodePath(parent, node.key)
  if (node.children) {
    out.push(path)
    node.children.forEach((c) => collectContainerPaths(c, path, out))
  }
}

interface NodeViewProps {
  node: DiffNode
  path: string
  showUnchanged: boolean
  collapsed: Set<string>
  onToggle: (path: string) => void
}

function NodeView({ node, path, showUnchanged, collapsed, onToggle }: NodeViewProps) {
  if (!showUnchanged && !node.hasChanges && node.status === 'unchanged') return null

  const badge = node.status !== 'unchanged' ? STATUS_BADGES[node.status] : null

  if (node.children) {
    const isCollapsed = collapsed.has(path)
    const isArray = node.kind === 'array'
    const visibleChildren = showUnchanged
      ? node.children
      : node.children.filter((c) => c.hasChanges || c.status !== 'unchanged')

    return (
      <div>
        <button
          type="button"
          onClick={() => onToggle(path)}
          className={`flex items-center gap-1 w-full text-left rounded px-1 hover:bg-slate-100 ${STATUS_CLASSES[node.status]}`}
        >
          {isCollapsed ? <ChevronRight size={13} className="text-slate-400 shrink-0" /> : <ChevronDown size={13} className="text-slate-400 shrink-0" />}
          {badge && <span className={`font-mono text-xs font-bold ${badge.className}`}>{badge.label}</span>}
          <span className="font-mono text-sm font-semibold text-blue-800">{node.key}</span>
          <span className={`text-xs ${isArray ? 'text-orange-500' : 'text-sky-500'}`}>
            {isArray ? `[${node.children.length}]` : `{${node.children.length}}`}
          </span>
          {!showUnchanged && visibleChildren.length < node.children.length && (
            <span className="text-[10px] text-slate-400">({node.children.length - visibleChildren.length} unchanged hidden)</span>
          )}
        </button>
        {!isCollapsed && (
          <div className="border-l border-slate-200 ml-[7px] pl-3">
            {visibleChildren.map((child) => (
              <NodeView
                key={String(child.key)}
                node={child}
                path={nodePath(path, child.key)}
                showUnchanged={showUnchanged}
                collapsed={collapsed}
                onToggle={onToggle}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`flex items-start gap-1 rounded px-1 ${STATUS_CLASSES[node.status]}`}>
      {badge && <span className={`font-mono text-xs font-bold mt-0.5 ${badge.className}`}>{badge.label}</span>}
      <span className="font-mono text-sm text-blue-700">{node.key}</span>
      <span className="text-slate-400 text-sm">:</span>
      {node.status === 'modified' ? (
        <>
          <span className="font-mono text-sm line-through text-red-700 break-all">{formatValue(node.oldValue)}</span>
          <span className="text-slate-400 text-xs mt-0.5">→</span>
          <span className="font-mono text-sm text-green-700 break-all">{formatValue(node.value)}</span>
        </>
      ) : (
        <span
          className={`font-mono text-sm break-all ${node.status === 'removed' ? 'line-through text-red-700' : node.status === 'added' ? 'text-green-700' : valueClassName(node.value)}`}
        >
          {formatValue(node.status === 'removed' ? node.oldValue : node.value)}
        </span>
      )}
    </div>
  )
}

export interface DiffTreeProps {
  node: DiffNode
  showUnchanged?: boolean
  /** Bump to expand all nodes. */
  expandAllSignal?: number
  /** Bump to collapse all nodes. */
  collapseAllSignal?: number
}

export function DiffTree({ node, showUnchanged = true, expandAllSignal = 0, collapseAllSignal = 0 }: DiffTreeProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [seenSignals, setSeenSignals] = useState({ expand: expandAllSignal, collapse: collapseAllSignal })

  const allContainerPaths = useMemo(() => {
    const out: string[] = []
    node.children?.forEach((c) => collectContainerPaths(c, '', out))
    return out
  }, [node])

  if (expandAllSignal !== seenSignals.expand || collapseAllSignal !== seenSignals.collapse) {
    setSeenSignals({ expand: expandAllSignal, collapse: collapseAllSignal })
    setCollapsed(expandAllSignal !== seenSignals.expand ? new Set() : new Set(allContainerPaths))
  }

  const onToggle = (path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  if (!node.children) {
    return (
      <div className="text-sm">
        <NodeView node={node} path={nodePath('', node.key)} showUnchanged={showUnchanged} collapsed={collapsed} onToggle={onToggle} />
      </div>
    )
  }

  if (!showUnchanged && !node.hasChanges) {
    return <div className="text-sm text-slate-500 italic px-1">No differences — both JSON documents are identical.</div>
  }

  return (
    <div className="text-sm">
      {node.children.map((child) => (
        <NodeView
          key={String(child.key)}
          node={child}
          path={nodePath('', child.key)}
          showUnchanged={showUnchanged}
          collapsed={collapsed}
          onToggle={onToggle}
        />
      ))}
    </div>
  )
}
