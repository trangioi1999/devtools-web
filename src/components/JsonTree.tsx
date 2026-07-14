import { useState } from 'react'
import { buildJsonPath, type PathSegment } from '../lib/jsonPath'

interface JsonTreeProps {
  value: unknown
  onCopyPath?: (path: string) => void
  onCopyValue?: (value: unknown) => void
  highlightQuery?: string
}

function isExpandable(value: unknown): value is Record<string, unknown> | unknown[] {
  return value !== null && typeof value === 'object'
}

function matches(text: string, query?: string): boolean {
  if (!query) return false
  return text.toLowerCase().includes(query.toLowerCase())
}

function Node({
  keyLabel,
  value,
  path,
  onCopyPath,
  onCopyValue,
  highlightQuery,
}: {
  keyLabel: string
  value: unknown
  path: PathSegment[]
  onCopyPath?: (path: string) => void
  onCopyValue?: (value: unknown) => void
  highlightQuery?: string
}) {
  const [expanded, setExpanded] = useState(true)
  const testId = `toggle-${path[path.length - 1]}`
  const keyMatches = matches(keyLabel, highlightQuery)

  const handleKeyClick = () => onCopyPath?.(buildJsonPath(path))
  const handleValueClick = () => onCopyValue?.(value)

  if (isExpandable(value)) {
    const isArray = Array.isArray(value)
    const entries = isArray
      ? value.map((v, i) => [i, v] as const)
      : Object.entries(value)

    return (
      <div className="ml-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            data-testid={testId}
            onClick={() => setExpanded((e) => !e)}
            className="w-4 text-slate-400 hover:text-slate-700"
          >
            {expanded ? '▾' : '▸'}
          </button>
          <span
            onClick={handleKeyClick}
            className={`cursor-pointer font-mono text-sm ${
              keyMatches ? 'bg-yellow-200' : 'text-blue-700'
            }`}
          >
            {keyLabel}
          </span>
          <span className="text-slate-400 text-xs">
            {isArray ? `[${entries.length}]` : `{${entries.length}}`}
          </span>
        </div>
        {expanded && (
          <div className="border-l border-slate-200 pl-2">
            {entries.map(([k, v]) => (
              <Node
                key={String(k)}
                keyLabel={String(k)}
                value={v}
                path={[...path, k]}
                onCopyPath={onCopyPath}
                onCopyValue={onCopyValue}
                highlightQuery={highlightQuery}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  const valueText = JSON.stringify(value)
  const valueMatches = matches(valueText, highlightQuery)

  return (
    <div className="ml-3 flex items-center gap-1">
      <span className="w-4" />
      <span
        onClick={handleKeyClick}
        className={`cursor-pointer font-mono text-sm ${
          keyMatches ? 'bg-yellow-200' : 'text-blue-700'
        }`}
      >
        {keyLabel}
      </span>
      <span className="text-slate-400 text-sm">:</span>
      <span
        onClick={handleValueClick}
        className={`cursor-pointer font-mono text-sm text-emerald-700 ${
          valueMatches ? 'bg-yellow-200' : ''
        }`}
      >
        {valueText}
      </span>
    </div>
  )
}

export function JsonTree({ value, onCopyPath, onCopyValue, highlightQuery }: JsonTreeProps) {
  if (!isExpandable(value)) {
    return <div className="font-mono text-sm text-emerald-700">{JSON.stringify(value)}</div>
  }

  const entries = Array.isArray(value) ? value.map((v, i) => [i, v] as const) : Object.entries(value)

  return (
    <div className="text-sm">
      {entries.map(([k, v]) => (
        <Node
          key={String(k)}
          keyLabel={String(k)}
          value={v}
          path={[k]}
          onCopyPath={onCopyPath}
          onCopyValue={onCopyValue}
          highlightQuery={highlightQuery}
        />
      ))}
    </div>
  )
}
