import { buildJsonPath, type PathSegment } from './jsonPath'

export type TableCellValue =
  | { kind: 'primitive'; value: unknown }
  | { kind: 'nested'; rows: TableSubRow[] }

export interface TableSubRow {
  key: string
  path: string
  cell: TableCellValue
}

export interface TableColumn {
  key: string
}

export interface TableRow {
  id: string
  cells: Record<string, TableCellValue>
}

export type TableShape =
  | { kind: 'object-array'; columns: TableColumn[]; rows: TableRow[] }
  | { kind: 'key-value'; rows: TableSubRow[] }
  | { kind: 'index-value'; rows: TableSubRow[] }

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function toCell(value: unknown, segments: PathSegment[]): TableCellValue {
  if (value !== null && typeof value === 'object') {
    const entries: (readonly [PathSegment, unknown])[] = Array.isArray(value)
      ? value.map((v, i) => [i, v] as const)
      : Object.entries(value)

    return {
      kind: 'nested',
      rows: entries.map(([key, v]) => ({
        key: String(key),
        path: buildJsonPath([...segments, key]),
        cell: toCell(v, [...segments, key]),
      })),
    }
  }

  return { kind: 'primitive', value }
}

export function computeTableShape(value: unknown): TableShape {
  if (Array.isArray(value) && value.length > 0 && value.every(isPlainObject)) {
    const objects = value as Record<string, unknown>[]
    const columnKeys: string[] = []
    for (const obj of objects) {
      for (const key of Object.keys(obj)) {
        if (!columnKeys.includes(key)) columnKeys.push(key)
      }
    }

    const rows: TableRow[] = objects.map((obj, i) => ({
      id: String(i),
      cells: Object.fromEntries(columnKeys.map((key) => [key, toCell(obj[key], [i, key])])),
    }))

    return { kind: 'object-array', columns: columnKeys.map((key) => ({ key })), rows }
  }

  if (Array.isArray(value)) {
    return {
      kind: 'index-value',
      rows: value.map((v, i) => ({ key: String(i), path: buildJsonPath([i]), cell: toCell(v, [i]) })),
    }
  }

  if (isPlainObject(value)) {
    return {
      kind: 'key-value',
      rows: Object.entries(value).map(([key, v]) => ({ key, path: buildJsonPath([key]), cell: toCell(v, [key]) })),
    }
  }

  return { kind: 'key-value', rows: [{ key: '$', path: '$', cell: toCell(value, []) }] }
}
