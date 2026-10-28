import {
  COMPANY_CONTACT,
  COMPANY_LEGAL,
  COMPANY_LOGO_URL,
  COMPANY_PO_SIGNATURE_URL,
} from './companyLegal'
import {
  DEFAULT_PO_TERMS_AND_CONDITIONS,
  DEFAULT_PO_WAYBILL_INSTRUCTIONS,
  PO_PAYMENT_REMITTANCE_NOTE,
  normalizeSupplierBank,
  paymentTermsTextForPreset,
  type PoPaymentTermsPreset,
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

/**
 * Resolve Buyer (SELPIC) signature image for PDF.
 * Empty / missing → company default. `none` / `-` → blank sign line.
 */
export function resolvePoAuthorizedSignatureUrl(
  url?: string | null
): string {
  const t = String(url ?? '').trim()
  if (t === '-' || t.toLowerCase() === 'none') return ''
  if (!t) return COMPANY_PO_SIGNATURE_URL
  return t
}

/** ISO date (YYYY-MM-DD) → en display for PO signature date line; empty → —. */
export function formatPoSignatureDate(isoDate?: string | null): string {
  const raw = String(isoDate || '').trim()
  if (!raw) return '—'
  try {
    const date = new Date(raw.includes('T') ? raw : `${raw}T12:00:00`)
    if (Number.isNaN(date.getTime())) return raw
    const day = date.getDate()
    const month = date.toLocaleDateString('en-US', { month: 'short' })
    const year = date.getFullYear()
    return `${day} ${month} ${year}`
  } catch {
    return raw
  }
}

/**
 * Latest ship date shown on PO PDF meta
 * e.g. "On or before 10 Nov 2026".
 */
export function formatPoLatestShipDate(isoDate?: string | null): string {
  const d = formatPoSignatureDate(isoDate)
  if (d === '—') return d
  return `On or before ${d}`
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
    signatureImageUrl: COMPANY_PO_SIGNATURE_URL,
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
 * Payment paragraph for supplier PO email — follows Payment terms preset (not always 100% advance).
 */
export function buildPoSupplierEmailPaymentParagraph(input: {
  termsPreset?: PoPaymentTermsPreset | null
  termsText?: string | null
}): string {
  const preset = input.termsPreset || 'advance_100'
  const custom = String(input.termsText || '').trim()

  switch (preset) {
    case 'advance_100':
      return (
        'As per our agreed payment terms, 100% advance T/T payment will be remitted upon receipt of your written confirmation / signed PO copy, referencing the PO number on the transaction.'
      )
    case 'deposit_30_70_ship':
      return (
        'As per our agreed payment terms, a 30% deposit by T/T will be remitted upon receipt of your written confirmation / signed PO copy (please reference the PO number). The remaining 70% balance will be remitted before shipment.'
      )
    case 'deposit_30_70_bl':
      return (
        'As per our agreed payment terms, a 30% deposit by T/T will be remitted upon receipt of your written confirmation / signed PO copy (please reference the PO number). The remaining 70% balance will be remitted against a copy of the Bill of Lading.'
      )
    case 'net_30':
      return (
        'As per our agreed payment terms, payment will be remitted by T/T on Net 30 days from invoice date after your written confirmation / signed PO copy, referencing the PO number on the transaction.'
      )
    case 'custom':
      if (custom) {
        return `As per our agreed payment terms: ${custom}`
      }
      return (
        'As per our agreed payment terms stated on the attached Purchase Order, payment will be remitted by T/T after your written confirmation / signed PO copy, referencing the PO number on the transaction.'
      )
    default:
      return (
        'As per our agreed payment terms stated on the attached Purchase Order, payment will be remitted by T/T after your written confirmation / signed PO copy, referencing the PO number on the transaction.'
      )
  }
}

/**
 * Default supplier email body when sending a PO (admin can override via Message field).
 */
export function buildDefaultPoSupplierEmailBody(input: {
  poNumber: string
  contactPerson?: string | null
  vendorName?: string | null
  requiredShipDate?: string | null
  termsPreset?: PoPaymentTermsPreset | null
  termsText?: string | null
}): string {
  const vendor = String(input.vendorName || '').trim() || 'Supplier'
  const contactRaw = String(input.contactPerson || '').trim() || vendor
  const greetingName = /\bteam\b/i.test(contactRaw) ? contactRaw : `${contactRaw} Team`
  const company = COMPANY_LEGAL.companyName
  const poNumber = String(input.poNumber || '').trim() || 'PO'
  const shipLine = input.requiredShipDate
    ? formatPoLatestShipDate(input.requiredShipDate)
    : null

  const confirmLine = shipLine
    ? `Kindly review the order details and confirm acceptance of the items, quantities, pricing, and the latest ship date (${shipLine.toLowerCase()}).`
    : `Kindly review the order details and confirm acceptance of the items, quantities, pricing, and the latest ship date.`

  const paymentLine = buildPoSupplierEmailPaymentParagraph({
    termsPreset: input.termsPreset,
    termsText: input.termsText,
  })

  return (
    `Dear ${greetingName},\n\n` +
    `Please find attached Purchase Order ${poNumber} from ${company}.\n\n` +
    `${confirmLine}\n\n` +
    `${paymentLine}\n\n` +
    `Thank you, and we look forward to your prompt confirmation.`
  )
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
