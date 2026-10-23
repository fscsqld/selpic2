import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PO_TERMS_AND_CONDITIONS,
  DEFAULT_PO_WAYBILL_INSTRUCTIONS,
  OVERSEAS_ZERO_RATED_DISCLAIMER,
  PO_BINDING_OFFER_CLAUSE,
  PO_GOVERNING_LAW_CLAUSE,
  PO_INCOTERMS_MORE,
  PO_INCOTERMS_PRIMARY,
  PO_KR_FORWARDER_ZERO_RATED_NOTE,
  PO_PACK_UNITS,
  PO_PAYMENT_REMITTANCE_NOTE,
  PO_SHELF_LIFE_CLAUSE,
  PO_SHIP_TO_MODES,
  PO_THIRTY_DAY_INSPECTION_CLAUSE,
  PO_WAYBILL_CHECKLIST,
  formatIncotermLine,
  namedPlacePlaceholder,
  normalizeSupplierBank,
} from './purchaseOrderTypes'
import { getDefaultPurchaseOrderDoc } from './purchaseOrderDefaults'
import { COMPANY_LEGAL } from './companyLegal'
import { PO_DRAFT_PLACEHOLDER } from './invoiceRefNumber'

describe('PO approved copy & draft defaults', () => {
  it('uses approved overseas zero-rated disclaimer wording', () => {
    expect(OVERSEAS_ZERO_RATED_DISCLAIMER).toContain('Overseas export transaction (VAT 0%)')
    expect(OVERSEAS_ZERO_RATED_DISCLAIMER).toContain('shall be handled by Buyer upon entry')
  })

  it('includes numbered T&C: binding offer, 70% shelf-life, 30 business days, Qld law', () => {
    expect(DEFAULT_PO_TERMS_AND_CONDITIONS).toContain(PO_BINDING_OFFER_CLAUSE)
    expect(DEFAULT_PO_TERMS_AND_CONDITIONS).toContain(PO_SHELF_LIFE_CLAUSE)
    expect(DEFAULT_PO_TERMS_AND_CONDITIONS).toContain(PO_THIRTY_DAY_INSPECTION_CLAUSE)
    expect(DEFAULT_PO_TERMS_AND_CONDITIONS).toContain(PO_GOVERNING_LAW_CLAUSE)
    expect(PO_SHELF_LIFE_CLAUSE).toContain('seventy percent (70%)')
    expect(PO_THIRTY_DAY_INSPECTION_CLAUSE).toContain('thirty (30) business days')
    expect(PO_GOVERNING_LAW_CLAUSE).toContain('Queensland, Australia')
    expect(PO_GOVERNING_LAW_CLAUSE).toContain('Master Supply Agreement')
  })

  it('starts new PO with smart defaults (FOB Incheon, ship+14, Bill To ABN/ACN)', () => {
    const doc = getDefaultPurchaseOrderDoc()
    expect(doc.poMeta.poNumber).toBe(PO_DRAFT_PLACEHOLDER)
    expect(doc.taxRule).toBe('overseas_zero')
    expect(doc.payment.currency).toBe('KRW')
    expect(doc.trade.incoterm).toBe('FOB')
    expect(doc.trade.namedPlace).toBe('Incheon')
    expect(doc.trade.shipmentMethod).toBe('sea')
    expect(doc.payment.termsPreset).toBe('advance_100')
    expect(doc.payment.termsText).toMatch(/five \(5\) business days/i)
    expect(doc.payment.termsText).toMatch(/written acceptance/i)
    expect(doc.payment.termsText).toMatch(/signed PO returned by email/i)
    expect(doc.charges.freight).toBe(0)
    expect(doc.items[0].countryOfOrigin).toBe('Korea')
    expect(doc.poMeta.requiredShipDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(doc.billTo.name).toBe(COMPANY_LEGAL.companyName)
    expect(doc.billTo.abn).toBe(COMPANY_LEGAL.abn)
    expect(doc.billTo.acn).toBe(COMPANY_LEGAL.acn)
    expect(doc.billTo.address).toContain('Mansfield')
    expect(doc.buyer.name).toBe(COMPANY_LEGAL.companyName)
    expect(doc.buyer.abn).toBe(COMPANY_LEGAL.abn)
    expect(doc.buyer.acn).toBe(COMPANY_LEGAL.acn)
    expect(doc.payment.supplierBank.note).toBe(PO_PAYMENT_REMITTANCE_NOTE)
    expect(doc.payment.supplierBank.accountNumber).toBe('')
    expect(doc.shipTo.presetId).toBe('selpic_au')
  })

  it('streamlines primary Incoterms and keeps CIF/CFR/DAP under More', () => {
    expect(PO_INCOTERMS_PRIMARY).toEqual(['FOB', 'FCA', 'EXW', 'DDP', 'Custom'])
    expect(PO_INCOTERMS_MORE).toEqual(['CIF', 'CFR', 'DAP'])
    expect(formatIncotermLine('FOB', 'Incheon')).toBe('FOB Incheon')
    expect(formatIncotermLine('FCA', 'Hanam Hub')).toBe('FCA Hanam Hub')
    expect(formatIncotermLine('Custom', 'Ex Works Seoul')).toBe('Ex Works Seoul')
    expect(namedPlacePlaceholder('FOB')).toMatch(/Incheon/)
  })

  it('supports KR beauty pack units and remittance note', () => {
    expect(PO_PACK_UNITS.map((u) => u.label)).toEqual([
      'Carton (C/T)',
      'Box',
      'Set',
      'Pcs / Sheet',
    ])
    expect(PO_PAYMENT_REMITTANCE_NOTE).toContain('PO Number')
    expect(PO_PAYMENT_REMITTANCE_NOTE).toContain('PO-2026-XXXX')
  })

  it('normalizes legacy swiftOrAccount into accountNumber or swiftBic', () => {
    const asAccount = normalizeSupplierBank({
      accountName: 'Co',
      bankName: 'KB',
      accountNumber: '',
      swiftOrAccount: '123-456-789012',
    })
    expect(asAccount.accountNumber).toBe('123-456-789012')

    const asSwift = normalizeSupplierBank({
      accountName: 'Co',
      bankName: 'KB',
      accountNumber: '',
      swiftOrAccount: 'CZNBKRSEXXX',
    })
    expect(asSwift.swiftBic).toBe('CZNBKRSEXXX')
    expect(asSwift.accountNumber).toBe('')
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
