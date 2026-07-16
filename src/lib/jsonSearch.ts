export function matchesText(text: string, query: string): boolean {
  if (!query) return false
  return text.toLowerCase().includes(query.toLowerCase())
}

export function countJsonMatches(value: unknown, query: string): number {
  if (!query) return 0

  let count = 0

  function visit(keyLabel: string | null, val: unknown): void {
    if (keyLabel !== null && matchesText(keyLabel, query)) count++

    if (val !== null && typeof val === 'object') {
      if (Array.isArray(val)) {
        val.forEach((v, i) => visit(String(i), v))
      } else {
        Object.entries(val).forEach(([k, v]) => visit(k, v))
      }
    } else if (matchesText(JSON.stringify(val), query)) {
      count++
    }
  }

  visit(null, value)
  return count
}
