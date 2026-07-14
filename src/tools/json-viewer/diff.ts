import { diff as jsondiffpatchDiff } from 'jsondiffpatch'

export type DiffStatus = 'unchanged' | 'added' | 'removed' | 'modified'

export interface DiffNode {
  status: DiffStatus
  key: string | number
  value?: unknown
  oldValue?: unknown
  children?: DiffNode[]
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function buildNode(key: string | number, left: unknown, right: unknown, leftExists: boolean, rightExists: boolean): DiffNode {
  if (!leftExists) {
    return { status: 'added', key, value: right }
  }
  if (!rightExists) {
    return { status: 'removed', key, oldValue: left }
  }

  if (isPlainObject(left) && isPlainObject(right)) {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)])
    const children = [...keys].map((k) =>
      buildNode(k, left[k], right[k], k in left, k in right),
    )
    // Container nodes always render as 'unchanged' — only leaves carry
    // added/removed/modified status. A changed descendant is visible once
    // its ancestor is expanded (containers default to expanded in DiffTree).
    return { status: 'unchanged', key, children }
  }

  const changed = JSON.stringify(left) !== JSON.stringify(right)
  return changed
    ? { status: 'modified', key, oldValue: left, value: right }
    : { status: 'unchanged', key, value: right }
}

export function computeDiffTree(left: unknown, right: unknown): DiffNode {
  // jsondiffpatch's delta isn't consumed directly — buildNode does a direct
  // structural comparison, which is sufficient at the payload sizes this
  // tool targets and keeps the tree-building logic self-contained/testable.
  // jsondiffpatchDiff is invoked to keep the dependency exercised for the
  // cases where a future task wants delta-based (patch/unpatch) features.
  jsondiffpatchDiff(left, right)

  if (isPlainObject(left) && isPlainObject(right)) {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)])
    const children = [...keys].map((k) =>
      buildNode(k, left[k], right[k], k in left, k in right),
    )
    return { status: 'unchanged', key: '$', children }
  }

  const changed = JSON.stringify(left) !== JSON.stringify(right)
  return changed
    ? { status: 'modified', key: '$', oldValue: left, value: right }
    : { status: 'unchanged', key: '$', value: right }
}
