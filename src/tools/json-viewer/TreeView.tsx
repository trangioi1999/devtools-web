import { useState } from 'react'
import { buildJsonPath, type PathSegment } from '../../lib/jsonPath'
import { matchesText } from '../../lib/jsonSearch'
import { valueClassName } from '../../lib/jsonValueStyle'

interface TreeViewProps {
  value: unknown
  onCopyPath: (path: string) => void
  onCopyValue: (value: unknown) => void
  search: string
}

function isContainer(v: unknown): v is Record<string, unknown> | unknown[] {
  return v !== null && typeof v === 'object'
}

/** Inline summary shown on a collapsed container row, e.g. `sku "DT-011" · qty 2`. */
function previewOf(entries: [string, unknown][]): string {
  const primitives = entries.filter(([, v]) => !isContainer(v))
  const parts = primitives.slice(0, 4).map(([k, v]) => `${k} ${JSON.stringify(v)}`)
  const truncated = primitives.length > parts.length || entries.length > primitives.length
  return parts.join(' · ') + (truncated ? ' …' : '')
}

interface NodeProps {
  keyLabel: string
  value: unknown
  path: PathSegment[]
  onCopyPath: (path: string) => void
  onCopyValue: (value: unknown) => void
  search: string
}

function Node({ keyLabel, value, path, onCopyPath, onCopyValue, search }: NodeProps) {
  const [expanded, setExpanded] = useState(true)
  const keyMatch = matchesText(keyLabel, search)

  if (isContainer(value)) {
    const isArray = Array.isArray(value)
    const entries: [string, unknown][] = isArray
      ? value.map((v, i) => [String(i), v] as [string, unknown])
      : Object.entries(value)
    const badge = isArray ? `[${entries.length}]` : `{${entries.length}}`

    return (
      <div>
        <div className="flex gap-2 items-baseline">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="w-3 shrink-0 text-neutral-400"
          >
            {expanded ? '▾' : '▸'}
          </button>
          <button
            type="button"
            onClick={() => onCopyPath(buildJsonPath(path))}
            className={`font-semibold text-accent-700 ${keyMatch ? 'mark' : ''}`}
          >
            {keyLabel}
          </button>
          <span className="tag tag-neutral" style={{ fontSize: '10px', padding: '1px 7px' }}>
            {badge}
          </span>
          {!expanded && entries.length > 0 && (
            <span className="text-muted text-[11px] font-body italic truncate">{previewOf(entries)}</span>
          )}
        </div>
        {expanded && (
          <div className="border-l border-divider ml-[5px] pl-3">
            {entries.map(([k, v]) => (
              <Node
                key={k}
                keyLabel={k}
                value={v}
                path={[...path, isArray ? Number(k) : k]}
                onCopyPath={onCopyPath}
                onCopyValue={onCopyValue}
                search={search}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  const text = JSON.stringify(value)
  const valueMatch = matchesText(text, search)

  return (
    <div className="flex gap-2 items-baseline">
      <button
        type="button"
        onClick={() => onCopyPath(buildJsonPath(path))}
        className={`text-accent-700 ${keyMatch ? 'mark' : ''}`}
      >
        {keyLabel}
      </button>
      <span className="text-neutral-400">:</span>
      <button
        type="button"
        onClick={() => onCopyValue(value)}
        className={`${valueClassName(value)} ${valueMatch ? 'mark' : ''}`}
      >
        {text}
      </button>
    </div>
  )
}

export function TreeView({ value, onCopyPath, onCopyValue, search }: TreeViewProps) {
  if (!isContainer(value)) {
    return (
      <div className="font-mono text-[13px] leading-[1.9]">
        <span className={valueClassName(value)}>{JSON.stringify(value)}</span>
      </div>
    )
  }

  return (
    <div className="font-mono text-[13px] leading-[1.9]">
      <Node keyLabel="root" value={value} path={[]} onCopyPath={onCopyPath} onCopyValue={onCopyValue} search={search} />
    </div>
  )
}
