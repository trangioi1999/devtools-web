import { useState } from 'react'
import type { ApiModel } from './types'
import { SchemaTable } from './SchemaTable'

function ModelRow({ model, models }: { model: ApiModel; models: ApiModel[] }) {
  const [open, setOpen] = useState(false)

  return (
    <div id={`model-${model.name}`} className="card p-0 overflow-hidden mb-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 border-none bg-transparent cursor-pointer text-left hover:bg-neutral-100/70"
      >
        <span className="text-neutral-400">{open ? '▾' : '▸'}</span>
        <span className="font-mono text-sm font-semibold text-text">{model.name}</span>
        {typeof model.schema.description === 'string' && (
          <span className="ml-auto text-muted italic text-xs truncate max-w-[50%]">{model.schema.description}</span>
        )}
      </button>
      {open && (
        <div className="border-t border-divider px-3 py-2">
          <SchemaTable schema={model.schema} models={models} />
        </div>
      )}
    </div>
  )
}

export function ModelsSection({ models }: { models: ApiModel[] }) {
  if (models.length === 0) return null

  return (
    <div className="mt-6">
      <h3 className="mb-3">Schemas</h3>
      {models.map((m) => <ModelRow key={m.name} model={m} models={models} />)}
    </div>
  )
}
