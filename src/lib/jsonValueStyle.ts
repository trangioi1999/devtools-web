// Shared color coding so every view distinguishes value types the same way:
// string = muted green, number = muted blue, boolean = muted violet, null = gray italic.
export function valueClassName(value: unknown): string {
  if (value === null) return 'text-neutral-500 italic'
  switch (typeof value) {
    case 'string':
      return 'text-str'
    case 'number':
      return 'text-num'
    case 'boolean':
      return 'text-bool'
    default:
      return 'text-neutral-600'
  }
}

/** Badge label for containers: {n} for objects, [n] for arrays. */
export function containerBadge(value: unknown): string | null {
  if (Array.isArray(value)) return `[${value.length}]`
  if (value !== null && typeof value === 'object') return `{${Object.keys(value).length}}`
  return null
}
