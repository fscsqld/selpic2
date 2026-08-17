import { describe, expect, it } from 'vitest'

import {
  applyStatusWithLegalRetention,
  ensureLegalRetention,
  isEligibleForAppDeletion,
  legalRetentionPhase,
} from '@/lib/fundraising/legalRetention'
import { DEFAULT_FUNDRAISING_SETTINGS, type FundraisingPartner } from '@/lib/fundraising/types'

function samplePartner(over: Partial<FundraisingPartner> = {}): FundraisingPartner {
  return {
    id: 'fp_test',
    organizationName: 'Test School',
    contactName: 'Alex',
    contactEmail: 'alex@example.com',
    linkedPromoCode: 'TEST',
    status: 'active',
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
    ...over,
  }
}

describe('legalRetention', () => {
  it('classifies suspended partners into legal_retention with retentionUntil', () => {
    const ended = applyStatusWithLegalRetention(
      samplePartner(),
      'suspended',
      DEFAULT_FUNDRAISING_SETTINGS,
      '2024-06-01T00:00:00.000Z'
    )
    expect(ended.status).toBe('suspended')
    expect(ended.retentionArchiveClass).toBe('legal_retention')
    expect(ended.partnershipEndedAt).toBe('2024-06-01T00:00:00.000Z')
    expect(ended.retentionUntil).toBeTruthy()
    expect(ended.retentionYearsApplied).toBe(7)
    expect(legalRetentionPhase(ended, DEFAULT_FUNDRAISING_SETTINGS, new Date('2024-06-02'))).toBe(
      'retaining'
    )
    expect(isEligibleForAppDeletion(ended, DEFAULT_FUNDRAISING_SETTINGS, new Date('2024-06-02'))).toBe(
      false
    )
  })

  it('marks eligible for deletion after retentionUntil', () => {
    const partner = ensureLegalRetention(
      samplePartner({
        status: 'terminated',
        partnershipEndedAt: '2015-01-01T00:00:00.000Z',
      }),
      { ...DEFAULT_FUNDRAISING_SETTINGS, legalRetentionYears: 7 },
      '2015-01-01T00:00:00.000Z'
    )
    expect(legalRetentionPhase(partner, DEFAULT_FUNDRAISING_SETTINGS, new Date('2025-01-02'))).toBe(
      'eligible_delete'
    )
    expect(isEligibleForAppDeletion(partner, DEFAULT_FUNDRAISING_SETTINGS, new Date('2025-01-02'))).toBe(
      true
    )
  })

  it('clears retention fields when reactivated', () => {
    const suspended = applyStatusWithLegalRetention(
      samplePartner(),
      'suspended',
      DEFAULT_FUNDRAISING_SETTINGS,
      '2024-01-01T00:00:00.000Z'
    )
    const active = applyStatusWithLegalRetention(
      suspended,
      'active',
      DEFAULT_FUNDRAISING_SETTINGS,
      '2024-02-01T00:00:00.000Z'
    )
    expect(active.retentionArchiveClass).toBeUndefined()
    expect(active.retentionUntil).toBeUndefined()
    expect(active.partnershipEndedAt).toBeUndefined()
  })
})
