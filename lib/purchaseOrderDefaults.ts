import {
  COMPANY_CONTACT,
  COMPANY_LEGAL,
  COMPANY_LOGO_URL,
} from './companyLegal'
import {
  DEFAULT_PO_TERMS_AND_CONDITIONS,
  DEFAULT_PO_WAYBILL_INSTRUCTIONS,
  PO_PAYMENT_REMITTANCE_NOTE,
  normalizeSupplierBank,
  paymentTermsTextForPreset,
  type PurchaseOrderDoc,
  type PurchaseOrderLine,
} from './purchaseOrderTypes'
import { computePurchaseOrderTotals } from './purchaseOrderTotals'
import { PO_DRAFT_PLACEHOLDER } from './invoiceRefNumber'
import {
  buildDomesticHubInstructionBlock,
  syncCartonMarkingToPoNumber,
} from './poHubPresets'

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

/** YYYY-MM-DD = today + N calendar days (local). */
export function addCalendarDaysIso(days: number, from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Company name only — ABN/ACN render on separate lines in the PDF template. */
export function defaultPoBillToName(): string {
  return COMPANY_LEGAL.companyName
}

/** Default PO for Admin create — KRW / FOB Incheon / 100% advance / overseas zero-rated. */
export function getDefaultPurchaseOrderDoc(): PurchaseOrderDoc {
  const today = new Date().toISOString().split('T')[0]
  const items = [createEmptyPoLine(1)]
  const taxRule = 'overseas_zero' as const
  const currency = 'KRW' as const
  const charges = { freight: 0, insurance: 0, other: 0, otherLabel: '' }
  const totals = computePurchaseOrderTotals({ items, charges, taxRule, currency })

  return {
    poMeta: {
      // Draft marker — permanent PO-YYYY-MM-### allocated on Download / Send.
      poNumber: PO_DRAFT_PLACEHOLDER,
      issueDate: today,
      requiredShipDate: addCalendarDaysIso(14),
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
      presetId: 'selpic_au',
      address: COMPANY_CONTACT.address,
      destinationIdentifier: 'AU Warehouse',
      hubCompanyName: COMPANY_LEGAL.companyName,
      hubContactPerson: '',
      hubPhone: COMPANY_CONTACT.phone,
      waybillGuideUrl: '',
    },
    billTo: {
      name: defaultPoBillToName(),
      abn: COMPANY_LEGAL.abn,
      acn: COMPANY_LEGAL.acn,
      address: COMPANY_CONTACT.address,
    },
    trade: {
      incoterm: 'FOB',
      namedPlace: 'Incheon',
      shipmentMethod: 'sea',
    },
    payment: {
      currency,
      termsPreset: 'advance_100',
      termsText: paymentTermsTextForPreset('advance_100'),
      supplierBank: normalizeSupplierBank({
        accountName: '',
        bankName: '',
        accountNumber: '',
        swiftBic: '',
        bankCodeOrBranch: '',
        note: PO_PAYMENT_REMITTANCE_NOTE,
      }),
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

/**
 * Allocate / apply a final PO number and refresh Ship To carton + hub block
 * so PDF export does not keep `PO-DRAFT-000` in carton marking.
 */
export function applyFinalizedPoNumber(
  doc: PurchaseOrderDoc,
  nextPoNumber: string,
  status?: PurchaseOrderDoc['poMeta']['status']
): PurchaseOrderDoc {
  const prev = (doc.poMeta.poNumber || '').trim()
  const next = (nextPoNumber || '').trim()
  if (!next) return doc

  const cartonMarking = syncCartonMarkingToPoNumber(
    doc.shipTo.cartonMarking,
    doc.shipTo.destinationIdentifier,
    next,
    prev
  )

  const shipTo = { ...doc.shipTo, cartonMarking }
  let waybillInstructions = doc.waybillInstructions
  if (shipTo.mode === 'forwarder_kr') {
    waybillInstructions = {
      instructionText: buildDomesticHubInstructionBlock({
        forwarderName: shipTo.forwarderName,
        transportMode: shipTo.transportMode,
        recipientName: shipTo.hubCompanyName || '',
        phone: shipTo.hubPhone || '',
        address: shipTo.address,
        destinationIdentifier: shipTo.destinationIdentifier || '',
        poNumber: next,
        cartonMarking,
      }),
    }
  }

  return {
    ...doc,
    poMeta: {
      ...doc.poMeta,
      poNumber: next,
      status: status ?? doc.poMeta.status,
    },
    shipTo,
    waybillInstructions,
  }
}
