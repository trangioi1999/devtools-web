import { useMemo, useState } from 'react'
import type { Endpoint } from './types'

export function EndpointList({
  endpoints,
  onSelect,
  selected,
}: {
  endpoints: Endpoint[]
  onSelect: (endpoint: Endpoint) => void
  selected: Endpoint | null
}) {
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set())

  const grouped = useMemo(() => {
    const map = new Map<string, Endpoint[]>()
    for (const e of endpoints) {
      const list = map.get(e.tag) ?? []
      list.push(e)
      map.set(e.tag, list)
    }
    return map
  }, [endpoints])

  const toggleTag = (tag: string) => {
    setExpandedTags((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  return (
    <div className="text-sm">
      {[...grouped.entries()].map(([tag, list]) => (
        <div key={tag} className="mb-2">
          <button onClick={() => toggleTag(tag)} className="font-semibold text-slate-700 py-1">
            {expandedTags.has(tag) ? '▾' : '▸'} {tag}
          </button>
          {expandedTags.has(tag) && (
            <div className="ml-3">
              {list.map((e) => (
                <button
                  key={`${e.method}-${e.path}`}
                  onClick={() => onSelect(e)}
                  className={`block w-full text-left px-2 py-1 rounded font-mono text-xs ${
                    selected === e ? 'bg-slate-800 text-white' : 'hover:bg-slate-100'
                  }`}
                >
                  <span className="font-bold mr-2">{e.method}</span>{e.path}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
