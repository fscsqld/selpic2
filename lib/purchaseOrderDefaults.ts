import {
  COMPANY_CONTACT,
  COMPANY_LEGAL,
  COMPANY_LOGO_URL,
} from '@/lib/companyLegal'
import {
  DEFAULT_PO_TERMS_AND_CONDITIONS,
  DEFAULT_PO_WAYBILL_INSTRUCTIONS,
  paymentTermsTextForPreset,
  type PurchaseOrderDoc,
  type PurchaseOrderLine,
} from '@/lib/purchaseOrderTypes'
import { computePurchaseOrderTotals } from '@/lib/purchaseOrderTotals'
import { PO_DRAFT_PLACEHOLDER } from '@/lib/invoiceRefNumber'

export function createEmptyPoLine(lineNo: number): PurchaseOrderLine {
  return {
    lineNo,
    descriptionEn: '',
    descriptionKo: '',
    sku: '',
    packUnit: 'carton',
    qty: 1,
    unitPrice: 0,
    lineNote: '',
    countryOfOrigin: 'Korea',
    hsCode: '',
  }
}

/** Default PO for Admin create — KRW / FOB Busan / 100% advance / overseas zero-rated. */
export function getDefaultPurchaseOrderDoc(): PurchaseOrderDoc {
  const today = new Date().toISOString().split('T')[0]
  const items = [createEmptyPoLine(1)]
  const taxRule = 'overseas_zero' as const
  const currency = 'KRW' as const
  const charges = { freight: 0, insurance: 0, other: 0, otherLabel: '' }
  const totals = computePurchaseOrderTotals({ items, charges, taxRule, currency })

  return {
    poMeta: {
      // Editing/draft display id — permanent PO-YYYY-MM-### only on Download / Send.
      poNumber: PO_DRAFT_PLACEHOLDER,
      issueDate: today,
      requiredShipDate: '',
      revision: 0, // hidden in UI; kept for future amendments
      status: 'draft',
      supplierQuoteRef: '',
      labelLocale: 'en', // PDF labels fixed to English (selector removed from form)
    },
    buyer: {
      name: COMPANY_LEGAL.companyName,
      abn: COMPANY_LEGAL.abn,
      acn: COMPANY_LEGAL.acn,
      phone: COMPANY_CONTACT.phone,
      email: COMPANY_CONTACT.email,
      address: COMPANY_CONTACT.address,
      logoUrl: COMPANY_LOGO_URL,
    },
    vendor: {
      name: '',
      address: '',
      contactPerson: '',
      email: '',
      phone: '',
      vatOrBizReg: '',
    },
    shipTo: {
      mode: 'selpic',
      address: COMPANY_CONTACT.address,
      hubCompanyName: '',
      hubContactPerson: '',
      hubPhone: '',
      waybillGuideUrl: '',
    },
    billTo: {
      name: `${COMPANY_LEGAL.companyName} (ABN: ${COMPANY_LEGAL.abn})`,
      abn: COMPANY_LEGAL.abn,
      address: COMPANY_CONTACT.address,
    },
    trade: {
      incoterm: 'FOB',
      namedPlace: 'Busan',
      shipmentMethod: 'sea',
    },
    payment: {
      currency,
      termsPreset: 'advance_100',
      termsText: paymentTermsTextForPreset('advance_100'),
      supplierBank: {
        accountName: '',
        bankName: '',
        swiftOrAccount: '',
        note: 'Please use the PO Number as the payment reference.',
      },
    },
    taxRule,
    items,
    charges,
    termsAndConditions: DEFAULT_PO_TERMS_AND_CONDITIONS,
    waybillInstructions: {
      instructionText: DEFAULT_PO_WAYBILL_INSTRUCTIONS,
    },
    notes: '',
    signatureImageUrl: '',
    totals,
  }
}

export function sanitizeSupplierNameForFilename(name: string): string {
  const raw = (name || '').trim() || 'Supplier'
  const ascii = raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
  return (ascii || 'Supplier').slice(0, 60)
}

export function buildPoPdfFilename(poNumber: string, supplierName: string): string {
  return `${poNumber}_${sanitizeSupplierNameForFilename(supplierName)}.pdf`
}
