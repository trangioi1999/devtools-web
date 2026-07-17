import { describe, it, expect } from 'vitest'
import { toCreateEndpoints } from './openapiToEndpoints'
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
})
