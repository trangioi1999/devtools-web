import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

interface SplitPaneProps {
  direction?: 'horizontal' | 'vertical'
  /** Initial size of the first pane, in percent (0–100). */
  initial?: number
  min?: number
  max?: number
  /** Persist the ratio under this localStorage key. */
  storageKey?: string
  children: [ReactNode, ReactNode]
}

export function SplitPane({ direction = 'horizontal', initial = 50, min = 15, max = 85, storageKey, children }: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [ratio, setRatio] = useState(() => {
    if (storageKey) {
      const saved = Number(localStorage.getItem(storageKey))
      if (Number.isFinite(saved) && saved >= min && saved <= max) return saved
    }
    return initial
  })
  const [dragging, setDragging] = useState(false)
  const isHorizontal = direction === 'horizontal'

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const pos = isHorizontal ? ((e.clientX - rect.left) / rect.width) * 100 : ((e.clientY - rect.top) / rect.height) * 100
      const clamped = Math.min(max, Math.max(min, pos))
      setRatio(clamped)
      if (storageKey) localStorage.setItem(storageKey, String(clamped))
    },
    [isHorizontal, min, max, storageKey],
  )

  useEffect(() => {
    if (!dragging) return
    const stop = () => setDragging(false)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', stop)
    document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', stop)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [dragging, onMouseMove, isHorizontal])

  return (
    <div ref={containerRef} className={`flex min-h-0 min-w-0 h-full w-full ${isHorizontal ? 'flex-row' : 'flex-col'} relative`}>
      <div className="min-h-0 min-w-0 overflow-hidden" style={{ flexBasis: `${ratio}%`, flexGrow: 0, flexShrink: 0 }}>
        {children[0]}
      </div>
      <div
        role="separator"
        aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
        onMouseDown={() => setDragging(true)}
        className={`shrink-0 flex group ${isHorizontal ? 'w-[5px] justify-center cursor-col-resize' : 'h-[5px] items-center cursor-row-resize'}`}
      >
        <div
          className={`bg-divider transition-colors group-hover:bg-accent ${isHorizontal ? 'w-px h-full' : 'h-px w-full'} ${
            dragging ? '!bg-accent' : ''
          }`}
        />
      </div>
      <div className="flex-1 min-h-0 min-w-0 overflow-hidden">{children[1]}</div>
      {dragging && <div className="absolute inset-0 z-50" />}
    </div>
  )
}
