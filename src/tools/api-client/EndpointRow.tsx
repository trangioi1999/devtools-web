import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { Endpoint } from './types'
import { SchemaTable } from './SchemaTable'
import { TryItOutForm } from './TryItOutForm'

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-sky-600',
  POST: 'bg-green-600',
  PUT: 'bg-orange-500',
  PATCH: 'bg-teal-600',
  DELETE: 'bg-red-600',
}

export function MethodChip({ method }: { method: string }) {
  return (
    <span
      className={`inline-block w-16 text-center text-white text-xs font-bold rounded px-1.5 py-0.5 ${
        METHOD_COLORS[method] ?? 'bg-slate-500'
      }`}
    >
      {method}
    </span>
  )
}

export function EndpointRow({ endpoint }: { endpoint: Endpoint }) {
  const [open, setOpen] = useState(false)
  const [tryItOut, setTryItOut] = useState(false)

  return (
    <div className={`border rounded mb-1.5 ${open ? 'border-slate-300 shadow-sm' : 'border-slate-200'}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50"
      >
        {open ? <ChevronDown size={14} className="text-slate-400 shrink-0" /> : <ChevronRight size={14} className="text-slate-400 shrink-0" />}
        <MethodChip method={endpoint.method} />
        <span className={`font-mono text-sm ${endpoint.deprecated ? 'line-through text-slate-400' : 'text-slate-800'}`}>
          {endpoint.path}
        </span>
        <span className="ml-auto text-xs text-slate-500 truncate max-w-[40%]">{endpoint.summary}</span>
      </button>

      {open && (
        <div className="border-t border-slate-200 px-4 py-3 flex flex-col gap-3">
          {endpoint.description && <p className="text-sm text-slate-600">{endpoint.description}</p>}

          {endpoint.parameters.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-700 uppercase mb-1">Parameters</h4>
              <table className="w-full text-xs border-collapse">
                <tbody>
                  {endpoint.parameters.map((p) => (
                    <tr key={`${p.in}:${p.name}`} className="border-t border-slate-100">
                      <td className="py-1 pr-3 font-mono text-blue-700">{p.name}</td>
                      <td className="py-1 pr-3 text-slate-500">{p.in}</td>
                      <td className="py-1 pr-3 font-mono text-emerald-700">{(p.schema?.type as string) ?? ''}</td>
                      <td className="py-1 pr-3">{p.required ? <span className="text-red-600">required</span> : <span className="text-slate-400">optional</span>}</td>
                      <td className="py-1 text-slate-600">{p.description ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {endpoint.requestBodySchema && (
            <div>
              <h4 className="text-xs font-semibold text-slate-700 uppercase mb-1">Request body</h4>
              <SchemaTable schema={endpoint.requestBodySchema} />
            </div>
          )}

          {(endpoint.responses?.length ?? 0) > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-700 uppercase mb-1">Responses</h4>
              {endpoint.responses?.map((r) => (
                <div key={r.status} className="mb-2">
                  <div className="text-xs">
                    <span className={`font-mono font-bold ${r.status.startsWith('2') ? 'text-green-700' : r.status.startsWith('4') || r.status.startsWith('5') ? 'text-red-600' : 'text-slate-700'}`}>
                      {r.status}
                    </span>
                    {r.description && <span className="text-slate-500 ml-2">{r.description}</span>}
                  </div>
                  {r.schema && (
                    <div className="mt-1 bg-slate-50 border border-slate-200 rounded p-2">
                      <SchemaTable schema={r.schema} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div>
            <button
              type="button"
              onClick={() => setTryItOut((v) => !v)}
              className={`px-3 py-1 text-sm rounded ${tryItOut ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-white'}`}
            >
              {tryItOut ? 'Hide try it out' : 'Try it out'}
            </button>
            {tryItOut && (
              <div className="mt-2 border border-slate-200 rounded">
                <TryItOutForm endpoint={endpoint} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
