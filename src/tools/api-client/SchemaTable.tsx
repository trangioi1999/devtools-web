import type { SchemaObject } from './types'

function typeLabel(schema: SchemaObject | undefined): string {
  if (!schema) return 'unknown'
  const ref = schema.$ref as string | undefined
  if (ref) return ref.split('/').pop() ?? 'unknown'
  const enumValues = schema.enum as unknown[] | undefined
  if (Array.isArray(enumValues)) return enumValues.map((v) => JSON.stringify(v)).join(' | ')
  const type = schema.type as string | undefined
  if (type === 'array') return `${typeLabel(schema.items as SchemaObject | undefined)}[]`
  if (type === 'object' || (!type && schema.properties)) return 'object'
  return type ?? 'unknown'
}

export function SchemaTable({ schema }: { schema: SchemaObject }) {
  const props = schema.properties as Record<string, SchemaObject> | undefined

  if (!props) {
    return <div className="text-xs font-mono text-slate-600 px-2 py-1">{typeLabel(schema)}</div>
  }

  const required = new Set((schema.required as string[] | undefined) ?? [])

  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="text-left text-slate-500">
          <th className="py-1 pr-3 font-medium">Field</th>
          <th className="py-1 pr-3 font-medium">Type</th>
          <th className="py-1 pr-3 font-medium">Required</th>
          <th className="py-1 font-medium">Description</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(props).map(([name, propSchema]) => (
          <tr key={name} className="border-t border-slate-100 align-top">
            <td className="py-1 pr-3 font-mono text-blue-700">{name}</td>
            <td className="py-1 pr-3 font-mono text-emerald-700">{typeLabel(propSchema)}</td>
            <td className="py-1 pr-3">{required.has(name) ? <span className="text-red-600">yes</span> : <span className="text-slate-400">no</span>}</td>
            <td className="py-1 text-slate-600">{(propSchema.description as string) ?? ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
