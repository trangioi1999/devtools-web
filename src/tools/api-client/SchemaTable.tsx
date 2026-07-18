import { useState } from 'react'
import type { ApiModel, SchemaObject } from './types'

const MAX_DEPTH = 5

function refNameOf(schema: SchemaObject | undefined): string | null {
  const ref = schema?.$ref as string | undefined
  return ref ? ref.split('/').pop() ?? null : null
}

export function typeLabel(schema: SchemaObject | undefined): string {
  if (!schema) return 'unknown'
  const ref = refNameOf(schema)
  if (ref) return ref
  const enumValues = schema.enum as unknown[] | undefined
  if (Array.isArray(enumValues)) return enumValues.map((v) => JSON.stringify(v)).join(' | ')
  const type = schema.type as string | undefined
  if (type === 'array') return `${typeLabel(schema.items as SchemaObject | undefined)}[]`
  if (type === 'object' || (!type && schema.properties)) return 'object'
  return type ?? 'unknown'
}

interface Resolver {
  byName: Map<string, SchemaObject>
}

export function makeResolver(models: ApiModel[] | undefined): Resolver {
  return { byName: new Map((models ?? []).map((m) => [m.name, m.schema])) }
}

/** The schema a row can expand into: a $ref target, array items, or an inline object. */
function expandable(schema: SchemaObject | undefined, resolver: Resolver): { name: string | null; schema: SchemaObject } | null {
  if (!schema) return null
  const ref = refNameOf(schema)
  if (ref) {
    const target = resolver.byName.get(ref)
    return target ? { name: ref, schema: target } : null
  }
  if (schema.type === 'array') {
    return expandable(schema.items as SchemaObject | undefined, resolver)
  }
  if (schema.properties) return { name: null, schema }
  return null
}

interface TableProps {
  schema: SchemaObject
  resolver: Resolver
  visited?: string[]
  depth?: number
}

function PropertiesTable({ schema, resolver, visited = [], depth = 0 }: TableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const props = schema.properties as Record<string, SchemaObject> | undefined
  if (!props) return <div className="text-xs font-mono text-neutral-700 px-2 py-1">{typeLabel(schema)}</div>

  const required = new Set((schema.required as string[] | undefined) ?? [])

  const toggle = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <table className="table" style={{ fontSize: 13 }}>
      {depth === 0 && (
        <thead>
          <tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr>
        </thead>
      )}
      <tbody>
        {Object.entries(props).map(([name, propSchema]) => {
          const child = depth < MAX_DEPTH ? expandable(propSchema, resolver) : null
          const isCycle = child?.name != null && visited.includes(child.name)
          const canExpand = child !== null && !isCycle
          const isOpen = expanded.has(name)

          return [
            <tr key={name}>
              <td className="font-mono text-accent-700 whitespace-nowrap">
                {canExpand ? (
                  <button type="button" onClick={() => toggle(name)} className="flex items-center gap-1 hover:underline">
                    <span className="text-neutral-400 w-3 inline-block">{isOpen ? '▾' : '▸'}</span>
                    {name}
                  </button>
                ) : (
                  <span className="pl-[16px]">{name}</span>
                )}
              </td>
              <td className="font-mono text-str">{typeLabel(propSchema)}{isCycle ? ' (circular)' : ''}</td>
              <td>
                {required.has(name) ? (
                  <span className="tag tag-accent" style={{ fontSize: 10 }}>required</span>
                ) : (
                  <span className="tag tag-neutral" style={{ fontSize: 10 }}>optional</span>
                )}
              </td>
              <td className="text-muted">{(propSchema.description as string) ?? ''}</td>
            </tr>,
            canExpand && isOpen ? (
              <tr key={`${name}-details`}>
                <td colSpan={4} className="!pl-4">
                  <div className="border-l-2 border-divider pl-3">
                    <PropertiesTable
                      schema={child.schema}
                      resolver={resolver}
                      visited={child.name ? [...visited, child.name] : visited}
                      depth={depth + 1}
                    />
                  </div>
                </td>
              </tr>
            ) : null,
          ]
        })}
      </tbody>
    </table>
  )
}

interface SchemaTableProps {
  schema: SchemaObject
  models?: ApiModel[]
}

/**
 * Renders a schema as a property table. $refs are resolved against the
 * spec's models: the model name is shown as a badge and its fields render
 * inline; nested refs expand on demand (cycle-safe).
 */
export function SchemaTable({ schema, models }: SchemaTableProps) {
  const resolver = makeResolver(models)

  // Unwrap top-level $ref / array-of-$ref so the fields show immediately
  // instead of just the model name.
  const ref = refNameOf(schema) ?? (schema.type === 'array' ? refNameOf(schema.items as SchemaObject | undefined) : null)
  const resolved = ref ? resolver.byName.get(ref) : null
  const isArray = schema.type === 'array'

  if (resolved) {
    return (
      <div>
        <div className="text-xs font-mono font-semibold text-neutral-700 mb-1">
          {ref}
          {isArray ? '[]' : ''}
        </div>
        <PropertiesTable schema={resolved} resolver={resolver} visited={[ref as string]} />
      </div>
    )
  }

  return <PropertiesTable schema={isArray && (schema.items as SchemaObject | undefined)?.properties ? (schema.items as SchemaObject) : schema} resolver={resolver} />
}
