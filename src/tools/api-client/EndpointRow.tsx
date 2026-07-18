import { useState } from 'react'
import type { ApiModel, Endpoint } from './types'
import { SchemaTable } from './SchemaTable'
import { TryItOutForm } from './TryItOutForm'

const METHOD_COLOR_VAR: Record<string, string> = {
  GET: 'var(--color-get)',
  POST: 'var(--color-post)',
  PUT: 'var(--color-put)',
  PATCH: 'var(--color-patch)',
  DELETE: 'var(--color-delete)',
}

export function MethodChip({ method }: { method: string }) {
  const color = METHOD_COLOR_VAR[method] ?? 'var(--color-accent-700)'
  return (
    <span
      className="inline-flex items-center justify-center font-mono font-semibold text-[11px]"
      style={{ width: 52, border: `1px solid ${color}`, color, borderRadius: 4, padding: '2px 0' }}
    >
      {method}
    </span>
  )
}

function statusClass(status: string): string {
  if (status.startsWith('2')) return 'text-str'
  if (status.startsWith('4') || status.startsWith('5')) return 'text-delete'
  return 'text-neutral-700'
}

export function EndpointRow({ endpoint, models }: { endpoint: Endpoint; models?: ApiModel[] }) {
  const [open, setOpen] = useState(false)
  const [tryItOut, setTryItOut] = useState(false)

  return (
    <div className="card p-0 overflow-hidden mb-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-3 py-2 border-none bg-transparent cursor-pointer text-left font-[inherit] hover:bg-neutral-100/70"
      >
        <MethodChip method={endpoint.method} />
        <span className={`font-mono text-[13px] ${endpoint.deprecated ? 'line-through text-neutral-400' : 'text-text'}`}>
          {endpoint.path}
        </span>
        <span className="ml-auto text-muted italic text-xs truncate max-w-[40%]">{endpoint.summary}</span>
        <span className="text-neutral-400">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="border-t border-divider px-3.5 py-3.5 flex flex-col gap-4">
          {endpoint.description && <p className="text-sm text-neutral-700 m-0">{endpoint.description}</p>}

          {endpoint.parameters.length > 0 && (
            <div>
              <h6 className="text-neutral-600">Parameters</h6>
              <table className="table" style={{ fontSize: 13 }}>
                <thead>
                  <tr><th>Name</th><th>In</th><th>Type</th><th>Required</th><th>Description</th></tr>
                </thead>
                <tbody>
                  {endpoint.parameters.map((p) => (
                    <tr key={`${p.in}:${p.name}`}>
                      <td className="font-mono text-accent-700">{p.name}</td>
                      <td>{p.in}</td>
                      <td className="font-mono">{(p.schema?.type as string) ?? ''}</td>
                      <td>
                        {p.required ? (
                          <span className="tag tag-accent" style={{ fontSize: 10 }}>required</span>
                        ) : (
                          <span className="tag tag-neutral" style={{ fontSize: 10 }}>optional</span>
                        )}
                      </td>
                      <td className="text-muted">{p.description ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {endpoint.requestBodySchema && (
            <div>
              <h6 className="text-neutral-600">Request body</h6>
              <SchemaTable schema={endpoint.requestBodySchema} models={models} />
            </div>
          )}

          {(endpoint.responses?.length ?? 0) > 0 && (
            <div>
              <h6 className="text-neutral-600">Responses</h6>
              {endpoint.responses?.map((r) => (
                <div key={r.status} className="mb-2">
                  <div className="flex items-baseline gap-2 text-[13px]">
                    <span className={`font-mono font-semibold tnum ${statusClass(r.status)}`}>{r.status}</span>
                    {r.description && <span className="text-muted">{r.description}</span>}
                  </div>
                  {r.schema && (
                    <div className="mt-1">
                      <SchemaTable schema={r.schema} models={models} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={() => setTryItOut((v) => !v)} className={tryItOut ? 'btn btn-secondary' : 'btn btn-primary'}>
              {tryItOut ? 'Hide try it out' : 'Try it out'}
            </button>
            <button type="button" onClick={() => setTryItOut(true)} className="btn btn-secondary">Copy as cURL</button>
          </div>
          {tryItOut && (
            <div className="border border-divider rounded-md">
              <TryItOutForm endpoint={endpoint} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
