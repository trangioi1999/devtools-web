import { dump } from 'js-yaml'

export function toYaml(value: unknown): string {
  return dump(value)
}

function capitalize(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function tsPrimitiveType(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'unknown' // handled separately by caller
  switch (typeof value) {
    case 'string':
      return 'string'
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    default:
      return 'unknown'
  }
}

interface PendingInterface {
  name: string
  value: Record<string, unknown>
}

function typeForValue(value: unknown, propName: string, interfaceNamePrefix: string, pending: PendingInterface[]): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return 'unknown[]'
    const elementTypes = new Set(value.map((el) => typeForValue(el, propName, interfaceNamePrefix, pending)))
    const union = [...elementTypes].join(' | ')
    return elementTypes.size > 1 ? `(${union})[]` : `${union}[]`
  }

  if (value !== null && typeof value === 'object') {
    const interfaceName = `${interfaceNamePrefix}${capitalize(propName)}`
    pending.push({ name: interfaceName, value: value as Record<string, unknown> })
    return interfaceName
  }

  return tsPrimitiveType(value)
}

function computeFields(obj: Record<string, unknown>, namePrefix: string, pending: PendingInterface[]): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const [key, val] of Object.entries(obj)) {
    fields[key] = typeForValue(val, key, namePrefix, pending)
  }
  return fields
}

function mergeFieldMaps(a: Record<string, string>, b: Record<string, string>): Record<string, string> {
  const merged: Record<string, string> = { ...a }
  for (const [key, type] of Object.entries(b)) {
    if (!(key in merged)) {
      merged[key] = type
    } else if (merged[key] !== type) {
      const types = new Set([...merged[key].split(' | '), ...type.split(' | ')])
      merged[key] = [...types].join(' | ')
    }
  }
  return merged
}

export function toTypeScriptInterface(value: unknown, rootName = 'Root'): string {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('toTypeScriptInterface requires a JSON object at the root')
  }

  const pending: PendingInterface[] = [{ name: rootName, value: value as Record<string, unknown> }]
  // Sibling array elements (e.g. items in an array of objects) can each push
  // a pending interface with the same generated name — merge those by name
  // (union of fields, union of conflicting field types) instead of emitting
  // multiple TS `interface` declarations with the same name, which TS would
  // silently combine via declaration merging into a misleading shape.
  const fieldsByName = new Map<string, Record<string, string>>()
  const order: string[] = []

  while (pending.length > 0) {
    const next = pending.shift() as PendingInterface
    const fields = computeFields(next.value, next.name, pending)
    if (fieldsByName.has(next.name)) {
      fieldsByName.set(next.name, mergeFieldMaps(fieldsByName.get(next.name) as Record<string, string>, fields))
    } else {
      order.push(next.name)
      fieldsByName.set(next.name, fields)
    }
  }

  const rendered = order.map((name) => {
    const fields = fieldsByName.get(name) as Record<string, string>
    const lines = Object.entries(fields).map(([key, type]) => `  ${key}: ${type}`)
    return `interface ${name} {\n${lines.join('\n')}\n}`
  })

  return rendered.join('\n\n')
}
