import { describe, expect, it } from 'vitest'
import {
  mergeBusinessProfileForSave,
  resolveGstRegisteredFlag,
} from '@/lib/settings/business-profile-save'

describe('mergeBusinessProfileForSave', () => {
  it('keeps gstRegistered false from current company draft (not overwritten by sole_trader)', () => {
    const saved = mergeBusinessProfileForSave(
      {
        individual: { individualName: 'Pat', accountType: 'individual', gstRegistered: false },
        company: {
          companyName: 'SELPIC',
          accountType: 'company',
          gstRegistered: false,
        },
        sole_trader: {
          companyName: 'Old ST',
          accountType: 'sole_trader',
          gstRegistered: true,
        },
      },
      {
        companyName: 'SELPIC',
        accountType: 'company',
        gstRegistered: false,
        gstReportingCycle: 'Quarterly',
        paygReportingCycle: 'Quarterly',
      }
    )
    expect(saved.gstRegistered).toBe(false)
    expect(saved.accountType).toBe('company')
    expect(saved.companyName).toBe('SELPIC')
  })

  it('persists gstRegistered true explicitly', () => {
    const saved = mergeBusinessProfileForSave(
      {},
      { accountType: 'company', gstRegistered: true, companyName: 'A' }
    )
    expect(saved.gstRegistered).toBe(true)
  })
})

describe('resolveGstRegisteredFlag', () => {
  it('treats undefined as registered (legacy)', () => {
    expect(resolveGstRegisteredFlag(undefined)).toBe(true)
  })
  it('treats false as not registered', () => {
    expect(resolveGstRegisteredFlag(false)).toBe(false)
  })
})
