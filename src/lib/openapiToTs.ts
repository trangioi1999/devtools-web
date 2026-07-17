import { pascalCase } from './jsonConvert'
import type { ApiModel, SchemaObject } from '../tools/api-client/types'

export interface SchemaToTsOptions {
  /** Prepended to every interface name (team convention: "I"). */
  prefix?: string
  /** Appended to every interface name (team convention: "BE" for API models). */
  suffix?: string
}

function decorate(name: string, prefix: string, suffix: string): string {
  return `${prefix}${pascalCase(name)}${suffix}`
}

function isSchema(v: unknown): v is SchemaObject {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function tsType(schema: SchemaObject | undefined, prefix: string, suffix: string): string {
  if (!schema) return 'unknown'

  const ref = schema.$ref as string | undefined
  if (ref) return decorate(ref.split('/').pop() ?? 'Unknown', prefix, suffix)

  const anyOf = (schema.oneOf ?? schema.anyOf) as unknown[] | undefined
  if (Array.isArray(anyOf)) {
    return anyOf.filter(isSchema).map((s) => tsType(s, prefix, suffix)).join(' | ') || 'unknown'
  }
  const allOf = schema.allOf as unknown[] | undefined
  if (Array.isArray(allOf)) {
    return allOf.filter(isSchema).map((s) => tsType(s, prefix, suffix)).join(' & ') || 'unknown'
  }

  const enumValues = schema.enum as unknown[] | undefined
  if (Array.isArray(enumValues) && enumValues.length > 0) {
    return enumValues.map((v) => JSON.stringify(v).replace(/"/g, "'")).join(' | ')
  }

  const type = schema.type as string | undefined
  switch (type) {
    case 'string':
      return 'string'
    case 'integer':
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'null':
      return 'null'
    case 'array': {
      const item = tsType(schema.items as SchemaObject | undefined, prefix, suffix)
      return item.includes(' ') ? `(${item})[]` : `${item}[]`
    }
    case 'object':
    case undefined: {
      const props = schema.properties as Record<string, SchemaObject> | undefined
      if (props) {
        const required = new Set((schema.required as string[] | undefined) ?? [])
        const fields = Object.entries(props).map(
          ([k, v]) => `${k}${required.has(k) ? '' : '?'}: ${tsType(v, prefix, suffix)}`,
        )
        return `{ ${fields.join('; ')} }`
      }
      if (isSchema(schema.additionalProperties)) {
        return `Record<string, ${tsType(schema.additionalProperties, prefix, suffix)}>`
      }
      return type === 'object' ? 'Record<string, unknown>' : 'unknown'
    }
    default:
      return 'unknown'
  }
}

function jsdoc(schema: SchemaObject, indent: string): string {
  const parts: string[] = []
  if (typeof schema.description === 'string') parts.push(schema.description.trim().replace(/\s+/g, ' '))
  if (typeof schema.format === 'string') parts.push(`Format: ${schema.format}`)
  if (schema.maxLength !== undefined) parts.push(`Max length: ${schema.maxLength}`)
  if (parts.length === 0) return ''
  return `${indent}/** ${parts.join(' — ')} */\n`
}

function renderModel(model: ApiModel, prefix: string, suffix: string): string {
  const name = decorate(model.name, prefix, suffix)
  const schema = model.schema
  const props = schema.properties as Record<string, SchemaObject> | undefined

  // Non-object schemas (enums, unions, primitives aliases) become type aliases.
  if (!props) {
    return `export type ${name} = ${tsType(schema, prefix, suffix)};`
  }

  const required = new Set((schema.required as string[] | undefined) ?? [])
  const lines = Object.entries(props).map(([key, propSchema]) => {
    const doc = jsdoc(propSchema, '  ')
    return `${doc}  ${key}${required.has(key) ? '' : '?'}: ${tsType(propSchema, prefix, suffix)};`
  })

  const header = typeof schema.description === 'string' ? `/** ${schema.description.trim().replace(/\s+/g, ' ')} */\n` : ''
  return `${header}export interface ${name} {\n${lines.join('\n')}\n}`
}

export function schemasToTypeScript(models: ApiModel[], options: SchemaToTsOptions = {}): string {
  const { prefix = 'I', suffix = '' } = options
  if (models.length === 0) return '// No schemas found in components.schemas'
  return models.map((m) => renderModel(m, prefix, suffix)).join('\n\n')
}
