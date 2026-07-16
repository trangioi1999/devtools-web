function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export interface ChartField {
  key: string
  type: 'string' | 'number'
}

export type ChartDataResult =
  | { ok: true; fields: ChartField[]; numericFields: string[]; labelFields: string[]; data: Record<string, unknown>[] }
  | { ok: false; reason: string }

export function computeChartData(value: unknown): ChartDataResult {
  if (!Array.isArray(value) || value.length === 0 || !value.every(isPlainObject)) {
    return { ok: false, reason: 'Chart view needs an array of objects.' }
  }

  const objects = value as Record<string, unknown>[]
  const fieldTypes = new Map<string, 'string' | 'number'>()

  for (const obj of objects) {
    for (const [key, val] of Object.entries(obj)) {
      if (fieldTypes.has(key)) continue
      if (typeof val === 'number') fieldTypes.set(key, 'number')
      else if (typeof val === 'string') fieldTypes.set(key, 'string')
    }
  }

  const numericFields = [...fieldTypes.entries()].filter(([, t]) => t === 'number').map(([k]) => k)
  if (numericFields.length === 0) {
    return { ok: false, reason: 'Chart view needs at least one numeric field.' }
  }

  const labelFields = [...fieldTypes.entries()].filter(([, t]) => t === 'string').map(([k]) => k)
  const fields: ChartField[] = [...fieldTypes.entries()].map(([key, type]) => ({ key, type }))

  return { ok: true, fields, numericFields, labelFields, data: objects }
}
