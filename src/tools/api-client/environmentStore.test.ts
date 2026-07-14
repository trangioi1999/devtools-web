import { describe, it, expect, beforeEach } from 'vitest'
import {
  listEnvironments,
  saveEnvironment,
  deleteEnvironment,
  getActiveEnvironmentId,
  setActiveEnvironmentId,
} from './environmentStore'

describe('environmentStore', () => {
  beforeEach(() => localStorage.clear())

  it('starts with no environments and no active environment', () => {
    expect(listEnvironments()).toEqual([])
    expect(getActiveEnvironmentId()).toBeNull()
  })

  it('saves and lists environments, upserting by id', () => {
    saveEnvironment({ id: '1', name: 'dev', baseUrl: 'https://dev.example.com', auth: { type: 'none' } })
    saveEnvironment({ id: '1', name: 'dev-renamed', baseUrl: 'https://dev.example.com', auth: { type: 'none' } })
    saveEnvironment({ id: '2', name: 'prod', baseUrl: 'https://prod.example.com', auth: { type: 'bearer', token: 'abc' } })

    const envs = listEnvironments()
    expect(envs).toHaveLength(2)
    expect(envs.find((e) => e.id === '1')?.name).toBe('dev-renamed')
  })

  it('deletes an environment', () => {
    saveEnvironment({ id: '1', name: 'dev', baseUrl: 'https://dev.example.com', auth: { type: 'none' } })
    deleteEnvironment('1')
    expect(listEnvironments()).toEqual([])
  })

  it('persists the active environment id', () => {
    setActiveEnvironmentId('2')
    expect(getActiveEnvironmentId()).toBe('2')
    setActiveEnvironmentId(null)
    expect(getActiveEnvironmentId()).toBeNull()
  })
})
