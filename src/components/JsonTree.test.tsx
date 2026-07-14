import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JsonTree } from './JsonTree'

describe('JsonTree', () => {
  it('renders primitive keys and values', () => {
    render(<JsonTree value={{ a: 1, b: 'x' }} />)
    expect(screen.getByText('a')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('collapses and expands a nested object node', async () => {
    const user = userEvent.setup()
    render(<JsonTree value={{ a: { b: 1 } }} />)
    expect(screen.getByText('b')).toBeInTheDocument()

    await user.click(screen.getByTestId('toggle-a'))
    expect(screen.queryByText('b')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('toggle-a'))
    expect(screen.getByText('b')).toBeInTheDocument()
  })

  it('calls onCopyPath with the built JSONPath when a node key is clicked', async () => {
    const user = userEvent.setup()
    const onCopyPath = vi.fn()
    render(<JsonTree value={{ a: [{ c: 1 }] }} onCopyPath={onCopyPath} />)

    await user.click(screen.getByText('c'))
    expect(onCopyPath).toHaveBeenCalledWith('a[0].c')
  })
})
