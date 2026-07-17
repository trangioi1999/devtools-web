import { describe, it, expect } from 'vitest'
import { toCreateEndpoints, detectCommonPrefix } from './openapiToEndpoints'
import type { Endpoint } from '../tools/api-client/types'

function ep(method: string, path: string, operationId?: string): Endpoint {
  return { method, path, tag: 'default', parameters: [], operationId }
}

describe('toCreateEndpoints', () => {
  it('generates the loan-info factory shape from paths', () => {
    const out = toCreateEndpoints([
      ep('GET', '/loan-info'),
      ep('GET', '/loan-info/{loanId}'),
      ep('GET', '/loan-info/transaction/{transactionId}'),
      ep('POST', '/loan-info'),
      ep('POST', '/loan-info/search'),
      ep('PUT', '/loan-info/{loanId}'),
      ep('DELETE', '/loan-info/{loanId}'),
    ])

    expect(out).toContain('function createEndpoints(basePath: string) {')
    expect(out).toContain('// GET')
    expect(out).toContain('getLoanInfo: `${basePath}/loan-info`,')
    expect(out).toContain('getLoanInfoById: (loanId: string) => `${basePath}/loan-info/${loanId}`,')
    expect(out).toContain(
      'getLoanInfoByTransaction: (transactionId: string) => `${basePath}/loan-info/transaction/${transactionId}`,',
    )
    expect(out).toContain('// POST')
    expect(out).toContain('postLoanInfo: `${basePath}/loan-info`,')
    expect(out).toContain('postLoanInfoSearch: `${basePath}/loan-info/search`,')
    expect(out).toContain('// PUT')
    expect(out).toContain('putLoanInfoById: (loanId: string) => `${basePath}/loan-info/${loanId}`,')
    expect(out).toContain('// DELETE')
    expect(out).toContain('deleteLoanInfoById: (loanId: string) => `${basePath}/loan-info/${loanId}`,')
    expect(out).toContain('} as const;')
  })

  it('prefers operationId when present', () => {
    const out = toCreateEndpoints([ep('GET', '/loan-info/search', 'searchLoanInfo')])
    expect(out).toContain('searchLoanInfo: `${basePath}/loan-info/search`,')
  })

  it('handles multiple path params in order', () => {
    const out = toCreateEndpoints([ep('GET', '/branches/{branchId}/users/{userId}')])
    expect(out).toContain(
      '(branchId: string, userId: string) => `${basePath}/branches/${branchId}/users/${userId}`,',
    )
  })

  it('dedupes colliding keys with a numeric suffix', () => {
    const out = toCreateEndpoints([ep('GET', '/a-b'), ep('GET', '/a/b')])
    expect(out).toContain('getAB:')
    expect(out).toContain('getAB2:')
  })

  it('strips a leading path prefix from urls and derived keys', () => {
    const out = toCreateEndpoints(
      [ep('GET', '/client-api/v1/workforce/teams'), ep('PUT', '/client-api/v1/workforce/shift-assignments/{id}')],
      { stripPrefix: '/client-api/v1' },
    )
    expect(out).toContain('getWorkforceTeams: `${basePath}/workforce/teams`,')
    expect(out).toContain('(id: string) => `${basePath}/workforce/shift-assignments/${id}`,')
    expect(out).not.toContain('client-api')
  })

  it('groups by tag first, then by method, when groupByTag is set', () => {
    const a = { ...ep('GET', '/teams'), tag: 'teams' }
    const b = { ...ep('POST', '/teams'), tag: 'teams' }
    const c = { ...ep('GET', '/calendar'), tag: 'calendar' }
    const out = toCreateEndpoints([a, c, b], { groupByTag: true })
    const teamsIdx = out.indexOf('// ===== teams =====')
    const calIdx = out.indexOf('// ===== calendar =====')
    expect(teamsIdx).toBeGreaterThanOrEqual(0)
    expect(calIdx).toBeGreaterThanOrEqual(0)
    expect(out.indexOf('getTeams:')).toBeGreaterThan(teamsIdx)
    expect(out.indexOf('postTeams:')).toBeGreaterThan(out.indexOf('getTeams:'))
  })
})

describe('detectCommonPrefix', () => {
  it('stops at the version segment even when more is shared', () => {
    expect(
      detectCommonPrefix([ep('GET', '/client-api/v1/workforce/teams'), ep('GET', '/client-api/v1/workforce/calendar')]),
    ).toBe('/client-api/v1')
  })

  it('finds the shared leading segments when there is no version', () => {
    expect(detectCommonPrefix([ep('GET', '/internal/teams'), ep('GET', '/internal/calendar')])).toBe('/internal')
  })

  it('returns empty when paths diverge at the first segment', () => {
    expect(detectCommonPrefix([ep('GET', '/a/x'), ep('GET', '/b/y')])).toBe('')
  })

  it('never swallows an entire path', () => {
    expect(detectCommonPrefix([ep('GET', '/api/teams'), ep('GET', '/api')])).toBe('')
  })
})
