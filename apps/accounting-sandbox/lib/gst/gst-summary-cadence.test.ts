import { describe, expect, it } from 'vitest'
import { gstSummaryCadenceLabel } from '@/lib/gst/gst-summary-cadence'

describe('gstSummaryCadenceLabel', () => {
  it('FY banner shows FY / Period even when toggle is quarterly', () => {
    expect(
      gstSummaryCadenceLabel(
        '2025-07-01',
        '2026-06-30',
        'quarterly',
        'FY 2025–26'
      )
    ).toBe('FY / Period')
  })

  it('full FY date span without FY label still shows FY / Period', () => {
    expect(
      gstSummaryCadenceLabel('2025-07-01', '2026-06-30', 'quarterly')
    ).toBe('FY / Period')
  })

  it('single BAS quarter stays Quarterly', () => {
    expect(
      gstSummaryCadenceLabel(
        '2026-04-01',
        '2026-06-30',
        'quarterly',
        'Q4 2025–26'
      )
    ).toBe('Quarterly')
  })

  it('month window shows Monthly', () => {
    expect(
      gstSummaryCadenceLabel('2026-05-01', '2026-05-31', 'monthly', 'May 2026')
    ).toBe('Monthly')
  })
})
