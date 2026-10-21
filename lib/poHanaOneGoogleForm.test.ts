import { describe, expect, it } from 'vitest'
import {
  buildDefaultHanaOnePrefillPayload,
  buildHanaOnePackageInfo,
  buildHanaOnePrefillUrl,
  canOpenHanaOneForm,
  formatHanaOneRecipientPhone,
  hanaOneForwarderLabel,
  isHanaOneFormConfigured,
  normalizeHanaOneFormPair,
  resolveHanaOneFormMode,
  resolveHanaOneRecipientName,
  viewFormUrlFromFormId,
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

  it('builds viewform URL from Form ID or passes through full URL', () => {
    expect(viewFormUrlFromFormId('1FAIpQLSeaTestId')).toBe(
      'https://docs.google.com/forms/d/e/1FAIpQLSeaTestId/viewform'
    )
    expect(viewFormUrlFromFormId('https://docs.google.com/forms/d/e/1FAIpQLAir/viewform')).toBe(
      'https://docs.google.com/forms/d/e/1FAIpQLAir/viewform'
    )
  })

  it('prefills Sea vs Air recipient Attn (not SELPIC company name)', () => {
    const doc = getDefaultPurchaseOrderDoc()
    expect(resolveHanaOneRecipientName(doc, 'sea')).toBe('브리즈번해상')
    expect(resolveHanaOneRecipientName(doc, 'air')).toBe('브리즈번항공')
    expect(hanaOneForwarderLabel('sea')).toBe('Hana One Express (Sea Freight)')
    expect(hanaOneForwarderLabel('air')).toBe('Hana One Express (Air Freight)')

    const seaPayload = buildDefaultHanaOnePrefillPayload({
      carrierCode: 'post',
      trackingNo: 'ABC',
      doc,
      mode: 'sea',
    })
    expect(seaPayload.recipientName).toBe('브리즈번해상')
    expect(seaPayload.recipientName).not.toMatch(/SELPIC/i)

    const airDoc = {
      ...doc,
      shipTo: { ...doc.shipTo, transportMode: 'air' as const, hubCompanyName: '브리즈번항공' },
    }
    expect(
      buildDefaultHanaOnePrefillPayload({
        carrierCode: 'post',
        trackingNo: 'XYZ',
        doc: airDoc,
        mode: 'air',
      }).recipientName
    ).toBe('브리즈번항공')
  })

  it('builds prefill URL with entry params and sea recipient', () => {
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
    expect(isHanaOneFormConfigured({ ...config, viewFormUrl: '', entryPackageInfo: 'entry.1' })).toBe(
      false
    )
    const doc = getDefaultPurchaseOrderDoc()
    const payload = buildDefaultHanaOnePrefillPayload({
      carrierCode: 'post',
      trackingNo: 'ABC',
      doc,
      mode: 'sea',
    })
    const url = buildHanaOnePrefillUrl(config, payload) || ''
    expect(url).toContain('entry.111=')
    const decoded = decodeURIComponent(url.replace(/\+/g, ' '))
    expect(decoded).toContain('브리즈번해상')
    expect(decoded).toContain('배송 요청')
    expect(decoded).toContain('수출 면장 대행 요청')
    expect(decoded).toContain('정식 수입 신고')
  })

  it('resolves Sea vs Air from hub transportMode first, then shipmentMethod', () => {
    const base = getDefaultPurchaseOrderDoc()
    expect(
      resolveHanaOneFormMode({
        ...base,
        shipTo: { ...base.shipTo, transportMode: 'air' },
        trade: { ...base.trade, shipmentMethod: 'sea' },
      })
    ).toBe('air')
    expect(
      resolveHanaOneFormMode({
        ...base,
        shipTo: { ...base.shipTo, transportMode: 'sea' },
        trade: { ...base.trade, shipmentMethod: 'air' },
      })
    ).toBe('sea')
    expect(
      resolveHanaOneFormMode({
        ...base,
        shipTo: { ...base.shipTo, transportMode: undefined },
        trade: { ...base.trade, shipmentMethod: 'air' },
      })
    ).toBe('air')
    expect(
      resolveHanaOneFormMode({
        ...base,
        shipTo: { ...base.shipTo, transportMode: undefined },
        trade: { ...base.trade, shipmentMethod: 'express' },
      })
    ).toBe('sea')
  })

  it('migrates legacy flat form config into Sea only', () => {
    const pair = normalizeHanaOneFormPair({
      viewFormUrl: 'https://docs.google.com/forms/d/e/LEGACY/viewform',
      entryPackageInfo: 'entry.999',
      entryRecipientName: 'entry.1',
    })
    expect(pair.sea.viewFormUrl).toContain('LEGACY')
    expect(pair.sea.entryPackageInfo).toBe('entry.999')
    expect(pair.air.viewFormUrl).toBe('')
    expect(isHanaOneFormConfigured(pair.sea)).toBe(true)
    expect(isHanaOneFormConfigured(pair.air)).toBe(false)
  })

  it('keeps separate Sea and Air mappings when both present', () => {
    const pair = normalizeHanaOneFormPair({
      sea: {
        viewFormUrl: 'https://docs.google.com/forms/d/e/SEA/viewform',
        entryPackageInfo: 'entry.sea',
      },
      air: {
        viewFormUrl: 'https://docs.google.com/forms/d/e/AIR/viewform',
        entryPackageInfo: 'entry.air',
      },
    })
    expect(pair.sea.viewFormUrl).toContain('/SEA/')
    expect(pair.air.viewFormUrl).toContain('/AIR/')
    expect(pair.sea.entryPackageInfo).toBe('entry.sea')
    expect(pair.air.entryPackageInfo).toBe('entry.air')
  })
})
