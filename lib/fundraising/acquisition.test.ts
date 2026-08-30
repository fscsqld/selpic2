import { describe, expect, it } from 'vitest'
import {
  acquisitionFromSearchParams,
  normalizeFundraisingAcquisition,
} from './acquisition'

describe('normalizeFundraisingAcquisition', () => {
  it('returns undefined for empty / organic apply', () => {
    expect(normalizeFundraisingAcquisition(undefined)).toBeUndefined()
    expect(normalizeFundraisingAcquisition({})).toBeUndefined()
    expect(normalizeFundraisingAcquisition({ ref: '  ', targetId: '' })).toBeUndefined()
  })

  it('keeps sparse fields and adds capturedAt', () => {
    const a = normalizeFundraisingAcquisition({
      ref: 'ai_agent',
      targetId: 'tgt_1',
      utmSource: 'email',
    })
    expect(a?.ref).toBe('ai_agent')
    expect(a?.targetId).toBe('tgt_1')
    expect(a?.utmSource).toBe('email')
    expect(a?.capturedAt).toMatch(/^\d{4}-/)
  })

  it('accepts target_id alias via search params helper', () => {
    const params = new URLSearchParams(
      'ref=ai_agent&target_id=abc&utm_source=resend&utm_medium=email&utm_campaign=schools'
    )
    const a = acquisitionFromSearchParams(params)
    expect(a).toEqual(
      expect.objectContaining({
        ref: 'ai_agent',
        targetId: 'abc',
        utmSource: 'resend',
        utmMedium: 'email',
        utmCampaign: 'schools',
      })
    )
  })
})
