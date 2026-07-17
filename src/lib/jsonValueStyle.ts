// Shared color coding so every view distinguishes value types the same way:
// string = emerald, number = amber, boolean = violet, null = gray italic.
export function valueClassName(value: unknown): string {
  if (value === null) return 'text-slate-400 italic'
  switch (typeof value) {
    case 'string':
      return 'text-emerald-700'
    case 'number':
      return 'text-amber-600'
    case 'boolean':
      return 'text-violet-600'
    default:
      return 'text-slate-600'
  }
}

/** Badge label for containers: {n} for objects, [n] for arrays. */
export function containerBadge(value: unknown): string | null {
  if (Array.isArray(value)) return `[${value.length}]`
  if (value !== null && typeof value === 'object') return `{${Object.keys(value).length}}`
  return null
}
