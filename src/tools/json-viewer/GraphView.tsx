import { useCallback, useMemo } from 'react'
import { ReactFlow, ReactFlowProvider, Background, Controls, useReactFlow, type Node, type Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { computeJsonGraphLayout, CARD_WIDTH, ROW_HEIGHT, HEADER_HEIGHT, MAX_NODES } from '../../lib/jsonGraphLayout'
import { GraphCard } from './GraphNode'

const nodeTypes = { card: GraphCard }

interface GraphCanvasProps {
  value: unknown
  onCopyPath: (path: string) => void
  onCopyValue: (value: unknown) => void
  search: string
}

function GraphCanvas({ value, onCopyPath, onCopyValue, search }: GraphCanvasProps) {
  const layout = useMemo(() => computeJsonGraphLayout(value), [value])
  const { setCenter } = useReactFlow()

  const onFocusNode = useCallback(
    (id: string) => {
      const target = layout.nodes.find((n) => n.id === id)
      if (!target) return
      const height = HEADER_HEIGHT + target.data.rows.length * ROW_HEIGHT
      setCenter(target.position.x + CARD_WIDTH / 2, target.position.y + height / 2, { zoom: 1, duration: 400 })
    },
    [layout, setCenter],
  )

  const nodes: Node[] = layout.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: { rows: n.data.rows, onCopyPath, onCopyValue, onFocusNode, search },
  }))

  const edges: Edge[] = layout.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
  }))

  return (
    <div className="h-full w-full relative">
      {layout.truncated && (
        <div className="absolute top-2 left-2 z-10 bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded border border-amber-300">
          Large JSON — showing the first {MAX_NODES} nodes. Try Table view for the full data.
        </div>
      )}
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView>
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
