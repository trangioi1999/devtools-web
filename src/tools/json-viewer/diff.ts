export type DiffStatus = 'unchanged' | 'added' | 'removed' | 'modified'

export interface DiffNode {
  status: DiffStatus
  key: string | number
  value?: unknown
  oldValue?: unknown
  children?: DiffNode[]
  /** set on container nodes so the UI can render {n} vs [n] badges */
  kind?: 'object' | 'array'
  /** true if this node or any descendant differs between the two sides */
  hasChanges: boolean
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isContainer(value: unknown): value is Record<string, unknown> | unknown[] {
  return isPlainObject(value) || Array.isArray(value)
}

function entriesOf(value: Record<string, unknown> | unknown[]): (readonly [string | number, unknown])[] {
  return Array.isArray(value) ? value.map((v, i) => [i, v] as const) : Object.entries(value)
}

// A subtree that exists on only one side: every descendant carries the same
// added/removed status so the tree can still be expanded and browsed.
function buildOneSide(key: string | number, value: unknown, status: 'added' | 'removed'): DiffNode {
  const base: DiffNode = status === 'added'
    ? { status, key, value, hasChanges: true }
    : { status, key, oldValue: value, hasChanges: true }

  if (isContainer(value)) {
    base.kind = Array.isArray(value) ? 'array' : 'object'
    base.children = entriesOf(value).map(([k, v]) => buildOneSide(k, v, status))
  }
  return base
}

function buildChildren(left: Record<string, unknown> | unknown[], right: Record<string, unknown> | unknown[]): DiffNode[] {
  if (Array.isArray(left) && Array.isArray(right)) {
    const max = Math.max(left.length, right.length)
    return Array.from({ length: max }, (_, i) =>
      buildNode(i, left[i], right[i], i < left.length, i < right.length),
    )
  }
  const l = left as Record<string, unknown>
  const r = right as Record<string, unknown>
  const keys = new Set([...Object.keys(l), ...Object.keys(r)])
  return [...keys].map((k) => buildNode(k, l[k], r[k], k in l, k in r))
}

function buildNode(key: string | number, left: unknown, right: unknown, leftExists: boolean, rightExists: boolean): DiffNode {
  if (!leftExists) return buildOneSide(key, right, 'added')
  if (!rightExists) return buildOneSide(key, left, 'removed')

  const bothObjects = isPlainObject(left) && isPlainObject(right)
  const bothArrays = Array.isArray(left) && Array.isArray(right)

  if (bothObjects || bothArrays) {
    const children = buildChildren(left as Record<string, unknown> | unknown[], right as Record<string, unknown> | unknown[])
    // Container nodes always render as 'unchanged' — only leaves carry
    // added/removed/modified status; hasChanges bubbles the signal up.
    return {
      status: 'unchanged',
      key,
      children,
      kind: bothArrays ? 'array' : 'object',
      hasChanges: children.some((c) => c.hasChanges),
    }
  }

  const changed = JSON.stringify(left) !== JSON.stringify(right)
  return changed
    ? { status: 'modified', key, oldValue: left, value: right, hasChanges: true }
    : { status: 'unchanged', key, value: right, hasChanges: false }
}

export function computeDiffTree(left: unknown, right: unknown): DiffNode {
  return buildNode('$', left, right, true, true)
}

export interface DiffCounts {
  added: number
  removed: number
  modified: number
}

/** Counts top-most changed nodes (an added/removed subtree counts once). */
export function countDiffs(node: DiffNode): DiffCounts {
  const counts: DiffCounts = { added: 0, removed: 0, modified: 0 }

  function visit(n: DiffNode): void {
    if (n.status !== 'unchanged') {
      counts[n.status as 'added' | 'removed' | 'modified'] += 1
      return
    }
    n.children?.forEach(visit)
  }

  visit(node)
  return counts
}
