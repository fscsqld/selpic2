import { describe, expect, it } from 'vitest'
import { getDefaultPurchaseOrderDoc } from './purchaseOrderDefaults'
import {
  applySupplierToPoDoc,
  catalogItemToPoLine,
  isCatalogPriceConfirmed,
  supplierFromPoDoc,
  type PoSupplierCatalogItem,
  type PoSupplierRecord,
} from './poSupplierTypes'

function sampleSupplier(overrides?: Partial<PoSupplierRecord>): PoSupplierRecord {
  return {
    id: 'po-sup-1',
    name: '한빛코스메틱',
    vendor: {
      name: '한빛코스메틱',
      email: 'order@hanbit.kr',
      phone: '02-1234-5678',
      contactPerson: 'Kim',
      address: 'Seoul',
      vatOrBizReg: '123-45-67890',
    },
    supplierBank: {
      accountName: '한빛코스메틱',
      bankName: 'KB',
      accountNumber: '123-456-789',
      swiftBic: '',
      bankCodeOrBranch: 'Gangnam',
    },
    defaults: {
      currency: 'KRW',
      termsPreset: 'advance_100',
      incoterm: 'FOB',
      namedPlace: 'Incheon',
      shipmentMethod: 'sea',
    },
    items: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const confirmedItem: PoSupplierCatalogItem = {
  id: 'sku-1',
  descriptionEn: 'Mediheel Mask',
  descriptionKo: '메디힐 마스크',
  sku: 'MH-001',
  packUnit: 'carton',
  unitPrice: 42000,
  lineNote: '8EA Display Box',
  countryOfOrigin: 'Korea',
  isActive: true,
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const unpricedItem: PoSupplierCatalogItem = {
  ...confirmedItem,
  id: 'sku-2',
  descriptionEn: 'New Serum',
  unitPrice: null,
}

describe('PO supplier catalog apply / snapshot', () => {
  it('applies supplier vendor, bank, and trade defaults without touching lines', () => {
    const doc = getDefaultPurchaseOrderDoc()
    doc.items = [
      {
        lineNo: 1,
        descriptionEn: 'Keep me',
        packUnit: 'box',
        qty: 2,
        unitPrice: 9,
      },
    ]
    const next = applySupplierToPoDoc(doc, sampleSupplier())
    expect(next.vendor.name).toBe('한빛코스메틱')
    expect(next.vendor.email).toBe('order@hanbit.kr')
    expect(next.payment.supplierBank.accountNumber).toBe('123-456-789')
    expect(next.payment.supplierBank.bankName).toBe('KB')
    expect(next.trade.incoterm).toBe('FOB')
    expect(next.trade.namedPlace).toBe('Incheon')
    expect(next.payment.currency).toBe('KRW')
    expect(next.items[0].descriptionEn).toBe('Keep me')
    expect(next.items[0].unitPrice).toBe(9)
  })

  it('snapshots confirmed catalog price onto PO line; qty-only reorder', () => {
    expect(isCatalogPriceConfirmed(confirmedItem)).toBe(true)
    const line = catalogItemToPoLine(confirmedItem, 5, 1)
    expect(line.qty).toBe(5)
    expect(line.unitPrice).toBe(42000)
    expect(line.descriptionEn).toBe('Mediheel Mask')
    expect(line.lineNote).toBe('8EA Display Box')
    expect(line.sku).toBe('MH-001')
  })

  it('does not invent a price when catalog price is unconfirmed (override allowed)', () => {
    expect(isCatalogPriceConfirmed(unpricedItem)).toBe(false)
    const bare = catalogItemToPoLine(unpricedItem, 3, 2)
    expect(bare.unitPrice).toBe(0)
    const withOverride = catalogItemToPoLine(unpricedItem, 3, 2, 15000)
    expect(withOverride.unitPrice).toBe(15000)
    expect(withOverride.qty).toBe(3)
  })

  it('builds a supplier draft from the current PO form and keeps existing catalog items', () => {
    const doc = getDefaultPurchaseOrderDoc()
    doc.vendor.name = 'New Co'
    doc.payment.supplierBank = {
      accountName: 'New Co',
      bankName: 'Shinhan',
      accountNumber: '999',
    }
    const existing = sampleSupplier({
      items: [confirmedItem],
    })
    const built = supplierFromPoDoc(doc, existing)
    expect(built.name).toBe('New Co')
    expect(built.supplierBank.bankName).toBe('Shinhan')
    expect(built.items).toHaveLength(1)
    expect(built.items[0].unitPrice).toBe(42000)
    expect(built.defaults?.namedPlace).toBe(doc.trade.namedPlace)
  })
})
