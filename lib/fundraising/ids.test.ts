import { describe, expect, it } from 'vitest'
import {
  newPartnerId,
  newOutreachTargetId,
  nextPartnerSequence,
  outreachTargetIdPrefix,
  partnerIdPrefix,
  slugOrgForPartnerId,
} from './ids'

describe('newPartnerId TP-SLUG-n', () => {
  it('slugs organisation names', () => {
    expect(slugOrgForPartnerId('SELPIC & Co')).toBe('SELPICCO')
    expect(slugOrgForPartnerId('Sunnybank Kindergarten')).toBe('SUNNYBAN')
  })

  it('builds prefix and next sequence', () => {
    expect(partnerIdPrefix('SELPIC')).toBe('TP-SELPIC')
    expect(nextPartnerSequence('TP-SELPIC', [])).toBe(1)
    expect(
      nextPartnerSequence('TP-SELPIC', ['TP-SELPIC-1', 'TP-SELPIC-6', 'TP-SELPICCO-260803-A3K'])
    ).toBe(7)
  })

  it('formats like TP-SELPIC-7', () => {
    expect(newPartnerId('SELPIC', ['TP-SELPIC-1', 'TP-SELPIC-6'])).toBe('TP-SELPIC-7')
    expect(newPartnerId('SELPIC', [])).toBe('TP-SELPIC-1')
  })
})

describe('newOutreachTargetId OT-SLUG-n', () => {
  it('builds OT prefix and ignores legacy fot-* ids', () => {
    expect(outreachTargetIdPrefix('Sunnybank Kindergarten')).toBe('OT-SUNNYBAN')
    expect(
      nextPartnerSequence('OT-SUNNYBAN', ['fot-lkxyz12-abcd', 'OT-SUNNYBAN-2'])
    ).toBe(3)
  })

  it('formats like OT-SUNNYBAN-1', () => {
    expect(newOutreachTargetId('Sunnybank Kindergarten', [])).toBe('OT-SUNNYBAN-1')
    expect(newOutreachTargetId('Sunnybank Kindergarten', ['OT-SUNNYBAN-1'])).toBe('OT-SUNNYBAN-2')
  })
})
