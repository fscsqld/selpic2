import { describe, expect, it } from 'vitest'
import {
  newPartnerId,
  nextPartnerSequence,
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
