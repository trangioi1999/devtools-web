import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useToast } from './useToast'

describe('useToast', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('adds a toast when showToast is called', () => {
    const { result } = renderHook(() => useToast())
    act(() => result.current.showToast('Copied!'))
    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0].text).toBe('Copied!')
  })

  it('removes the toast after the timeout', () => {
    const { result } = renderHook(() => useToast())
    act(() => result.current.showToast('Copied!'))
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current.toasts).toHaveLength(0)
  })

  it('supports multiple simultaneous toasts with distinct ids', () => {
    const { result } = renderHook(() => useToast())
    act(() => {
      result.current.showToast('First')
      result.current.showToast('Second')
    })
    expect(result.current.toasts).toHaveLength(2)
    expect(result.current.toasts[0].id).not.toBe(result.current.toasts[1].id)
  })
})
