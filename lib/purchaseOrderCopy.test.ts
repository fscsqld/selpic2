import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PO_TERMS_AND_CONDITIONS,
  DEFAULT_PO_WAYBILL_INSTRUCTIONS,
  OVERSEAS_ZERO_RATED_DISCLAIMER,
  PO_KR_FORWARDER_ZERO_RATED_NOTE,
  PO_SHIP_TO_MODES,
  PO_THIRTY_DAY_INSPECTION_CLAUSE,
  PO_WAYBILL_CHECKLIST,
} from './purchaseOrderTypes'
import { getDefaultPurchaseOrderDoc } from './purchaseOrderDefaults'
import { PO_DRAFT_PLACEHOLDER } from './invoiceRefNumber'

describe('PO approved copy & draft defaults', () => {
  it('uses approved overseas zero-rated disclaimer wording', () => {
    expect(OVERSEAS_ZERO_RATED_DISCLAIMER).toContain('Overseas export transaction (VAT 0%)')
    expect(OVERSEAS_ZERO_RATED_DISCLAIMER).toContain('shall be handled by Buyer upon entry')
  })

  it('includes 30-day inspection clause in default T&C', () => {
    expect(PO_THIRTY_DAY_INSPECTION_CLAUSE).toContain('within 30 days')
    expect(DEFAULT_PO_TERMS_AND_CONDITIONS).toContain(PO_THIRTY_DAY_INSPECTION_CLAUSE)
    expect(DEFAULT_PO_TERMS_AND_CONDITIONS).toContain('Queensland, Australia')
  })

  it('starts new PO documents on PO-DRAFT-000', () => {
    const doc = getDefaultPurchaseOrderDoc()
    expect(doc.poMeta.poNumber).toBe(PO_DRAFT_PLACEHOLDER)
    expect(doc.taxRule).toBe('overseas_zero')
    expect(doc.payment.currency).toBe('KRW')
    expect(doc.trade.incoterm).toBe('FOB')
    expect(doc.trade.namedPlace).toBe('Busan')
  })

  it('exposes approved Ship To presets and KR hub zero-rated note', () => {
    expect(PO_SHIP_TO_MODES.map((m) => m.label)).toEqual([
      'SELPIC Warehouse (Australia)',
      'Korean Logistics Hub / Forwarder',
      'Custom Address',
    ])
    expect(PO_KR_FORWARDER_ZERO_RATED_NOTE).toContain('export documentation')
    expect(PO_KR_FORWARDER_ZERO_RATED_NOTE).toContain('0% VAT')
  })

  it('includes domestic waybill (배대지) instructions and checklist', () => {
    expect(DEFAULT_PO_WAYBILL_INSTRUCTIONS).toContain('NOT SELPIC Australia')
    expect(DEFAULT_PO_WAYBILL_INSTRUCTIONS).toContain('PO Number')
    expect(DEFAULT_PO_WAYBILL_INSTRUCTIONS).toContain('Outer carton marking')
    expect(DEFAULT_PO_WAYBILL_INSTRUCTIONS).toContain('Box 1 of 6 (AIR)')
    expect(PO_WAYBILL_CHECKLIST.some((c) => c.includes('Box N of T'))).toBe(true)
    const doc = getDefaultPurchaseOrderDoc()
    expect(doc.waybillInstructions?.instructionText).toContain('Korean logistics hub')
  })
})
