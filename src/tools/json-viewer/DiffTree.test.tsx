import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DiffTree } from './DiffTree'
import type { DiffNode } from './diff'

describe('DiffTree', () => {
  it('renders an unchanged leaf with its value', () => {
    const node: DiffNode = { status: 'unchanged', key: '$', children: [{ status: 'unchanged', key: 'a', value: 1 }] }
    render(<DiffTree node={node} />)
    expect(screen.getByText('a')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('renders a modified leaf showing old and new value', () => {
    const node: DiffNode = { status: 'unchanged', key: '$', children: [{ status: 'modified', key: 'a', oldValue: 1, value: 2 }] }
    render(<DiffTree node={node} />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('renders an added leaf', () => {
    const node: DiffNode = { status: 'unchanged', key: '$', children: [{ status: 'added', key: 'b', value: 2 }] }
    render(<DiffTree node={node} />)
    expect(screen.getByText('b')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('renders a removed leaf using its old value', () => {
    const node: DiffNode = { status: 'unchanged', key: '$', children: [{ status: 'removed', key: 'b', oldValue: 2 }] }
    render(<DiffTree node={node} />)
    expect(screen.getByText('b')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})
