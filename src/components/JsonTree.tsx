import { useState } from 'react'
import { buildJsonPath, type PathSegment } from '../lib/jsonPath'
import { valueClassName } from '../lib/jsonValueStyle'

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
            className="w-4 text-neutral-400 hover:text-text"
          >
            {expanded ? '▾' : '▸'}
          </button>
          <span
            onClick={handleKeyClick}
            className={`cursor-pointer font-mono text-sm font-semibold text-accent-700 ${keyMatches ? 'mark' : ''}`}
          >
            {keyLabel}
          </span>
          <span className="text-neutral-400 text-xs">
            {isArray ? `[${entries.length}]` : `{${entries.length}}`}
          </span>
        </div>
        {expanded && (
          <div className="border-l border-divider pl-2">
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
        className={`cursor-pointer font-mono text-sm text-accent-700 ${keyMatches ? 'mark' : ''}`}
      >
        {keyLabel}
      </span>
      <span className="text-neutral-400 text-sm">:</span>
      <span
        onClick={handleValueClick}
        className={`cursor-pointer font-mono text-sm ${valueClassName(value)} ${valueMatches ? 'mark' : ''}`}
      >
        {valueText}
      </span>
    </div>
  )
}

export function JsonTree({ value, onCopyPath, onCopyValue, highlightQuery }: JsonTreeProps) {
  if (!isExpandable(value)) {
    return <div className={`font-mono text-sm ${valueClassName(value)}`}>{JSON.stringify(value)}</div>
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
