import { describe, it, expect, beforeEach } from 'vitest'
import { loadJsonViewerContent, saveJsonViewerContent } from './jsonViewerStore'

describe('jsonViewerStore', () => {
  beforeEach(() => localStorage.clear())

  it('returns a default sample when nothing is stored', () => {
    expect(loadJsonViewerContent().length).toBeGreaterThan(0)
  })

  it('round-trips saved content', () => {
    saveJsonViewerContent('{"a":1}')
    expect(loadJsonViewerContent()).toBe('{"a":1}')
  })
})
