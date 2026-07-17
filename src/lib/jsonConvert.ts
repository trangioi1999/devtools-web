import { dump } from 'js-yaml'

export function toYaml(value: unknown): string {
  return dump(value)
}

function pascalCase(name: string): string {
  const parts = name.split(/[^a-zA-Z0-9]+/).filter(Boolean)
  if (parts.length === 0) return 'Field'
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('')
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

export interface TsInterfaceOptions {
  /** Name of the root interface before prefix/suffix are applied. */
  rootName?: string
  /** Prepended to every interface name (team convention: "I"). */
  prefix?: string
  /** Appended to every interface name (team convention: "BE" for API models). */
  suffix?: string
}

// Interface names map 1-1 to the JSON key they came from ("environment" ->
// "IEnvironment", "telemetry_logs" -> "ITelemetryLogs"), wrapped in the
// configured prefix/suffix. Two different keys can collide on the same
// PascalCase name (e.g. "my_key" and "myKey") — the later one gets a numeric
// counter so declarations stay distinct.
interface NameRegistry {
  byKey: Map<string, string>
  used: Set<string>
  prefix: string
  suffix: string
}

function decorateName(pascal: string, registry: NameRegistry): string {
  let name = `${registry.prefix}${pascal}${registry.suffix}`
  if (/^\d/.test(name)) name = `_${name}`
  return name
}

function interfaceNameForKey(key: string, registry: NameRegistry): string {
  const existing = registry.byKey.get(key)
  if (existing) return existing

  const base = decorateName(pascalCase(key), registry)
  let candidate = base
  let counter = 2
  while (registry.used.has(candidate)) {
    candidate = `${base}${counter}`
    counter += 1
  }
  registry.used.add(candidate)
  registry.byKey.set(key, candidate)
  return candidate
}

function typeForValue(value: unknown, propName: string, registry: NameRegistry, pending: PendingInterface[]): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return 'unknown[]'
    const elementTypes = new Set(value.map((el) => typeForValue(el, propName, registry, pending)))
    const union = [...elementTypes].join(' | ')
    return elementTypes.size > 1 ? `(${union})[]` : `${union}[]`
  }

  if (value !== null && typeof value === 'object') {
    const interfaceName = interfaceNameForKey(propName, registry)
    pending.push({ name: interfaceName, value: value as Record<string, unknown> })
    return interfaceName
  }

  return tsPrimitiveType(value)
}

function computeFields(obj: Record<string, unknown>, registry: NameRegistry, pending: PendingInterface[]): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const [key, val] of Object.entries(obj)) {
    fields[key] = typeForValue(val, key, registry, pending)
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

export function toTypeScriptInterface(value: unknown, options: TsInterfaceOptions = {}): string {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('toTypeScriptInterface requires a JSON object at the root')
  }

  const { rootName = 'Root', prefix = 'I', suffix = '' } = options
  const registry: NameRegistry = { byKey: new Map(), used: new Set(), prefix, suffix }
  const fullRootName = decorateName(pascalCase(rootName), registry)
  registry.used.add(fullRootName)
  const pending: PendingInterface[] = [{ name: fullRootName, value: value as Record<string, unknown> }]
  // The same key appearing in multiple places (e.g. objects inside an array,
  // or repeated nested keys) maps to one interface name — merge those by name
  // (union of fields, union of conflicting field types) instead of emitting
  // multiple TS `interface` declarations with the same name, which TS would
  // silently combine via declaration merging into a misleading shape.
  const fieldsByName = new Map<string, Record<string, string>>()
  const order: string[] = []

  while (pending.length > 0) {
    const next = pending.shift() as PendingInterface
    const fields = computeFields(next.value, registry, pending)
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
    return `export interface ${name} {\n${lines.join('\n')}\n}`
  })

  return rendered.join('\n\n')
}
