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

function renderInterface(name: string, obj: Record<string, unknown>, pending: PendingInterface[]): string {
  const lines = Object.entries(obj).map(([key, val]) => {
    const type = typeForValue(val, key, name, pending)
    return `  ${key}: ${type}`
  })
  return `interface ${name} {\n${lines.join('\n')}\n}`
}

export function toTypeScriptInterface(value: unknown, rootName = 'Root'): string {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('toTypeScriptInterface requires a JSON object at the root')
  }

  const pending: PendingInterface[] = [{ name: rootName, value: value as Record<string, unknown> }]
  const rendered: string[] = []

  while (pending.length > 0) {
    const next = pending.shift() as PendingInterface
    rendered.push(renderInterface(next.name, next.value, pending))
  }

  return rendered.join('\n\n')
}
