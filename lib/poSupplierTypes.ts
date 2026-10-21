/**
 * Korean supplier master + per-supplier catalog for Admin PO (P2a/P2b).
 * Separate from storefront catalog and Invoice Saved Clients (customers).
 */

import type {
  PoCurrency,
  PoIncoterm,
  PoPackUnit,
  PoPaymentTermsPreset,
  PoShipmentMethod,
  PurchaseOrderDoc,
  PurchaseOrderLine,
  PurchaseOrderSupplierBank,
} from './purchaseOrderTypes'
import { normalizeSupplierBank, paymentTermsTextForPreset } from './purchaseOrderTypes'

/** Catalog SKU under one supplier — unit price optional until confirmed. */
export interface PoSupplierCatalogItem {
  id: string
  descriptionEn: string
  descriptionKo?: string
  sku?: string
  packUnit: PoPackUnit
  /**
   * Confirmed unit price in the supplier's default currency.
   * null / undefined = not confirmed yet (admin must set price when adding to PO).
   */
  unitPrice: number | null
  lineNote?: string
  countryOfOrigin?: string
  hsCode?: string
  /** Soft-hide without deleting history of past POs that snapped this SKU. */
  isActive: boolean
  updatedAt: string
}

export interface PoSupplierRecord {
  id: string
  /** Display name (usually Korean company legal name). */
  name: string
  vendor: {
    name: string
    address?: string
    contactPerson?: string
    email?: string
    phone?: string
    vatOrBizReg?: string
  }
  supplierBank: PurchaseOrderSupplierBank
  /** Defaults applied when this supplier is selected on a new PO. */
  defaults?: {
    currency?: PoCurrency
    termsPreset?: PoPaymentTermsPreset
    incoterm?: PoIncoterm
    namedPlace?: string
    shipmentMethod?: PoShipmentMethod
  }
  items: PoSupplierCatalogItem[]
  createdAt: string
  updatedAt: string
}

export function createEmptyCatalogItem(): Omit<PoSupplierCatalogItem, 'id' | 'updatedAt'> {
  return {
    descriptionEn: '',
    descriptionKo: '',
    sku: '',
    packUnit: 'carton',
    unitPrice: null,
    lineNote: '',
    countryOfOrigin: 'Korea',
    hsCode: '',
    isActive: true,
  }
}

export function isCatalogPriceConfirmed(item: PoSupplierCatalogItem): boolean {
  return typeof item.unitPrice === 'number' && Number.isFinite(item.unitPrice) && item.unitPrice >= 0
}

/** Snapshot catalog row onto a PO line (prices freeze on the document). */
export function catalogItemToPoLine(
  item: PoSupplierCatalogItem,
  qty: number,
  lineNo: number,
  overrideUnitPrice?: number
): PurchaseOrderLine {
  const price =
    typeof overrideUnitPrice === 'number' && Number.isFinite(overrideUnitPrice)
      ? overrideUnitPrice
      : isCatalogPriceConfirmed(item)
        ? (item.unitPrice as number)
        : 0
  return {
    lineNo,
    descriptionEn: item.descriptionEn,
    descriptionKo: item.descriptionKo || '',
    sku: item.sku || '',
    packUnit: item.packUnit,
    qty: Math.max(0, Number(qty) || 0),
    unitPrice: price,
    lineNote: item.lineNote || '',
    countryOfOrigin: item.countryOfOrigin || 'Korea',
    hsCode: item.hsCode || '',
  }
}

/**
 * Fill vendor + bank (+ optional trade/payment defaults) from a saved supplier.
 * Does not touch line items — catalog adds are separate.
 */
export function applySupplierToPoDoc(
  doc: PurchaseOrderDoc,
  supplier: PoSupplierRecord
): PurchaseOrderDoc {
  const bank = normalizeSupplierBank(supplier.supplierBank)
  const d = supplier.defaults || {}
  const termsPreset = d.termsPreset ?? doc.payment.termsPreset
  const nextTermsText =
    termsPreset === 'custom'
      ? doc.payment.termsText
      : paymentTermsTextForPreset(termsPreset) || doc.payment.termsText

  return {
    ...doc,
    vendor: {
      name: supplier.vendor.name || supplier.name,
      address: supplier.vendor.address || '',
      contactPerson: supplier.vendor.contactPerson || '',
      email: supplier.vendor.email || '',
      phone: supplier.vendor.phone || '',
      vatOrBizReg: supplier.vendor.vatOrBizReg || '',
    },
    payment: {
      ...doc.payment,
      currency: d.currency ?? doc.payment.currency,
      termsPreset,
      termsText: nextTermsText,
      supplierBank: bank,
    },
    trade: {
      ...doc.trade,
      incoterm: d.incoterm ?? doc.trade.incoterm,
      namedPlace:
        d.namedPlace !== undefined && d.namedPlace !== null
          ? d.namedPlace
          : doc.trade.namedPlace,
      shipmentMethod: d.shipmentMethod ?? doc.trade.shipmentMethod,
    },
  }
}

/** Build a supplier record from the current PO form (quick save). */
export function supplierFromPoDoc(
  doc: PurchaseOrderDoc,
  existing?: PoSupplierRecord | null
): Omit<PoSupplierRecord, 'id' | 'createdAt' | 'updatedAt' | 'items'> & {
  items: PoSupplierCatalogItem[]
} {
  const name = (doc.vendor.name || '').trim() || 'Untitled supplier'
  return {
    name,
    vendor: {
      name,
      address: doc.vendor.address || '',
      contactPerson: doc.vendor.contactPerson || '',
      email: doc.vendor.email || '',
      phone: doc.vendor.phone || '',
      vatOrBizReg: doc.vendor.vatOrBizReg || '',
    },
    supplierBank: normalizeSupplierBank(doc.payment.supplierBank),
    defaults: {
      currency: doc.payment.currency,
      termsPreset: doc.payment.termsPreset,
      incoterm: doc.trade.incoterm,
      namedPlace: doc.trade.namedPlace,
      shipmentMethod: doc.trade.shipmentMethod,
    },
    items: existing?.items ? existing.items.map((i) => ({ ...i })) : [],
  }
}
