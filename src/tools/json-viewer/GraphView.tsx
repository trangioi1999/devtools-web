import { useCallback, useEffect, useMemo, useState } from 'react'
import { ReactFlow, ReactFlowProvider, Background, Controls, useReactFlow, type Node, type Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { X } from 'lucide-react'
import { computeJsonGraphLayout, MAX_NODES } from '../../lib/jsonGraphLayout'
import { GraphCard } from './GraphNode'

const nodeTypes = { card: GraphCard }

const EDGE_STYLE = { stroke: '#cbd5e1', strokeWidth: 1.5 }
const FOCUS_EDGE_STYLE = { stroke: '#3b82f6', strokeWidth: 2 }

interface GraphCanvasProps {
  value: unknown
  onCopyPath: (path: string) => void
  onCopyValue: (value: unknown) => void
  search: string
}

function GraphCanvas({ value, onCopyPath, onCopyValue, search }: GraphCanvasProps) {
  const [focusId, setFocusId] = useState<string | null>(null)
  const { fitView } = useReactFlow()

  // A new document invalidates old paths — drop any active focus.
  useEffect(() => setFocusId(null), [value])

  const layout = useMemo(() => computeJsonGraphLayout(value, focusId), [value, focusId])

  useEffect(() => {
    const raf = requestAnimationFrame(() => fitView({ duration: 300, maxZoom: 1 }))
    return () => cancelAnimationFrame(raf)
  }, [focusId, fitView])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFocusId(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const onFocusNode = useCallback((id: string) => setFocusId((cur) => (cur === id ? null : id)), [])

  const chainSet = useMemo(() => new Set(layout.focusChain), [layout])

  const nodes: Node[] = layout.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: { rows: n.data.rows, onCopyPath, onCopyValue, onFocusNode, search, focused: n.id === focusId },
  }))

  // Edges along the root→focus chain are highlighted so the path to the
  // focused node stays readable among its descendants.
  const edges: Edge[] = layout.edges.map((e) => {
    const onChain = focusId !== null && chainSet.has(e.source) && chainSet.has(e.target)
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      type: 'smoothstep',
      style: onChain ? FOCUS_EDGE_STYLE : EDGE_STYLE,
    }
  })

  return (
    <div className="h-full w-full relative">
      {layout.truncated && (
        <div className="absolute top-2 left-2 z-10 bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded border border-amber-300">
          Large JSON — showing the first {MAX_NODES} nodes. Try Table view for the full data.
        </div>
      )}
      {focusId && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-blue-50 border border-blue-300 text-blue-800 text-xs px-2 py-1 rounded font-mono max-w-[80%]">
          <span className="truncate">Focused: {focusId}</span>
          <button
            type="button"
            onClick={() => setFocusId(null)}
            title="Clear focus (Esc)"
            className="shrink-0 hover:text-blue-950"
          >
            <X size={12} />
          </button>
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onFocusNode(node.id)}
        onPaneClick={() => setFocusId(null)}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}

export function GraphView({ value, onCopyPath, onCopyValue, search }: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvas value={value} onCopyPath={onCopyPath} onCopyValue={onCopyValue} search={search} />
    </ReactFlowProvider>
  )
}
