import { describe, expect, it } from 'vitest'
import {
  buildDefaultHanaOnePrefillPayload,
  buildHanaOnePackageInfo,
  buildHanaOnePrefillUrl,
  canOpenHanaOneForm,
  formatHanaOneRecipientPhone,
  isHanaOneFormConfigured,
  type HanaOneGoogleFormConfig,
} from './poHanaOneGoogleForm'
import { getDefaultPurchaseOrderDoc } from './purchaseOrderDefaults'

describe('poHanaOneGoogleForm', () => {
  it('formats AU phone as +61… digits', () => {
    expect(formatHanaOneRecipientPhone('+61 466 894 279')).toBe('+61466894279')
  })

  it('builds package info line', () => {
    expect(
      buildHanaOnePackageInfo({
        carrierCode: 'cj',
        trackingNo: '1234567890',
        itemsSummary: 'Mask × 10',
        total: 42120,
        currency: 'KRW',
      })
    ).toContain('CJ대한통운 1234567890')
  })

  it('gates Open Form until carrier + tracking saved', () => {
    expect(
      canOpenHanaOneForm({ carrierCode: 'cj', trackingNo: '1', logisticsSaved: false })
    ).toBe(false)
    expect(
      canOpenHanaOneForm({ carrierCode: 'cj', trackingNo: '1', logisticsSaved: true })
    ).toBe(true)
    expect(
      canOpenHanaOneForm({ carrierCode: '', trackingNo: '1', logisticsSaved: true })
    ).toBe(false)
  })

  it('builds prefill URL with entry params', () => {
    const config: HanaOneGoogleFormConfig = {
      viewFormUrl: 'https://docs.google.com/forms/d/e/TEST/viewform',
      entryRecipientName: 'entry.111',
      entryRecipientPhone: 'entry.222',
      entryRecipientEmail: 'entry.333',
      entryPackageInfo: 'entry.444',
      entryDeliveryAddress: 'entry.555',
      entryDeliveryOption: 'entry.666',
      entryKrCustoms: 'entry.777',
      entryAuCustoms: 'entry.888',
    }
    expect(isHanaOneFormConfigured(config)).toBe(true)
    const doc = getDefaultPurchaseOrderDoc()
    const payload = buildDefaultHanaOnePrefillPayload({
      carrierCode: 'post',
      trackingNo: 'ABC',
      doc,
    })
    const url = buildHanaOnePrefillUrl(config, payload) || ''
    expect(url).toContain('entry.111=')
    expect(url).toContain('SELPIC')
    expect(url).toContain('entry.666=')
    const decoded = decodeURIComponent(url.replace(/\+/g, ' '))
    expect(decoded).toContain('배송 요청')
    expect(decoded).toContain('수출 면장 대행 요청')
    expect(decoded).toContain('정식 수입 신고')
  })
})
