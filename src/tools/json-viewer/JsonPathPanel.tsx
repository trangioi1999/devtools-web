import { useState } from 'react'
import { queryJsonPath, type JsonPathMatch } from '../../lib/jsonPathQuery'
import { JsonTree } from '../../components/JsonTree'

export function JsonPathPanel({ value }: { value: unknown }) {
  const [path, setPath] = useState('$')
  const [results, setResults] = useState<JsonPathMatch[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runQuery = () => {
    const result = queryJsonPath(value, path)
    if (result.ok) {
      setResults(result.results)
      setError(null)
    } else {
      setResults(null)
      setError(result.error)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') runQuery()
  }

  return (
    <div className="p-3 border-b border-slate-200">
      <div className="flex items-center gap-2">
        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="$.a.b[0]"
          className="flex-1 border border-slate-300 rounded px-2 py-1 font-mono text-sm"
        />
        <button onClick={runQuery} className="px-3 py-1 text-sm rounded bg-slate-800 text-white">Query</button>
      </div>
      {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
      {results && results.length === 0 && <div className="text-sm text-slate-500 mt-2">No matches.</div>}
      {results && results.length > 0 && (
        <div className="mt-2 flex flex-col gap-2 max-h-64 overflow-auto">
          {results.map((r, i) => (
            <div key={i} className="border border-slate-200 rounded p-2">
              <div className="text-xs text-slate-500 font-mono mb-1">{r.path}</div>
              <JsonTree value={r.value} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
