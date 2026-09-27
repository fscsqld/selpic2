import { describe, expect, it } from 'vitest'
import {
  countsTowardVipSummary,
  isAuthVipCustomerCandidate,
  isCompanyAdminEmail,
  isTestCustomerEmail,
} from './authCustomerRoster'

describe('authCustomerRoster', () => {
  it('classifies company admins and test customers', () => {
    expect(isCompanyAdminEmail('jimmy@selpic.com.au')).toBe(true)
    expect(isCompanyAdminEmail('info@selpic.com.au')).toBe(true)
    expect(isTestCustomerEmail('fscsqld@gmail.com')).toBe(true)
    expect(isTestCustomerEmail('mahalakshmi0108@gmail.com')).toBe(false)
  })

  it('VIP candidates exclude company admins but include real and test customers', () => {
    expect(
      isAuthVipCustomerCandidate({ id: '1', email: 'mahalakshmi0108@gmail.com' })
    ).toBe(true)
    expect(
      isAuthVipCustomerCandidate({ id: '2', email: 'fscsqld@gmail.com' })
    ).toBe(true)
    expect(
      isAuthVipCustomerCandidate({ id: '3', email: 'jimmy@selpic.com.au' })
    ).toBe(false)
  })

  it('summary counts exclude admins and test emails', () => {
    expect(countsTowardVipSummary('christine9763@hotmail.com')).toBe(true)
    expect(countsTowardVipSummary('fscsqld@gmail.com')).toBe(false)
    expect(countsTowardVipSummary('info@selpic.com.au')).toBe(false)
  })
})
