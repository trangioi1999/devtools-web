import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ApiModel } from './types'
import { SchemaTable } from './SchemaTable'

function ModelRow({ model }: { model: ApiModel }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-slate-200 rounded mb-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-50"
      >
        {open ? <ChevronDown size={13} className="text-slate-400" /> : <ChevronRight size={13} className="text-slate-400" />}
        <span className="font-mono text-sm font-semibold text-slate-800">{model.name}</span>
        {typeof model.schema.description === 'string' && (
          <span className="ml-auto text-xs text-slate-500 truncate max-w-[50%]">{model.schema.description}</span>
        )}
      </button>
      {open && (
        <div className="border-t border-slate-200 px-3 py-2">
          <SchemaTable schema={model.schema} />
        </div>
      )}
    </div>
  )
}

export function ModelsSection({ models }: { models: ApiModel[] }) {
  const [open, setOpen] = useState(true)
  if (models.length === 0) return null

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        Schemas <span className="text-slate-400 font-normal">({models.length})</span>
      </button>
      {open && models.map((m) => <ModelRow key={m.name} model={m} />)}
    </div>
  )
}
