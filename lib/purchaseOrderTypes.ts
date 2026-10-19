/**
 * Purchase Order (PO) document model for Admin procurement docs.
 * Buyer = SELPIC; remittance block = supplier bank (not COMPANY_BANK).
 */

export type PoStatus = 'draft' | 'sent' | 'confirmed' | 'closed' | 'cancelled'

export type PoIncoterm = 'EXW' | 'FOB' | 'CIF' | 'CFR' | 'DDP' | 'FCA' | 'DAP' | 'Custom'

export type PoShipmentMethod = 'air' | 'sea' | 'express'

export type PoCurrency = 'KRW' | 'USD' | 'AUD' | 'EUR'

export type PoTaxRule = 'overseas_zero' | 'au_gst_excluded' | 'au_gst_included'

export type PoPackUnit = 'carton' | 'box' | 'set' | 'pcs'

export type PoShipToMode = 'selpic' | 'forwarder_kr' | 'custom'

export type PoPaymentTermsPreset =
  | 'advance_100'
  | 'deposit_30_70_ship'
  | 'deposit_30_70_bl'
  | 'net_30'
  | 'custom'

export type PoLabelLocale = 'en' | 'ko'

export interface PurchaseOrderLine {
  lineNo: number
  descriptionEn: string
  descriptionKo?: string
  sku?: string
  packUnit: PoPackUnit
  qty: number
  unitPrice: number
  lineNote?: string
  countryOfOrigin?: string
  hsCode?: string
}

export interface PurchaseOrderSupplierBank {
  accountName: string
  bankName: string
  /** SWIFT and/or account number (free text for overseas banks). */
  swiftOrAccount: string
  note?: string
}

export interface PurchaseOrderDoc {
  poMeta: {
    poNumber: string
    issueDate: string
    requiredShipDate?: string
    revision?: number
    status: PoStatus
    supplierQuoteRef?: string
    labelLocale: PoLabelLocale
  }
  buyer: {
    name: string
    abn?: string
    acn?: string
    phone?: string
    email?: string
    address?: string
    logoUrl?: string
  }
  vendor: {
    name: string
    address?: string
    contactPerson?: string
    email?: string
    phone?: string
    vatOrBizReg?: string
  }
  shipTo: {
    mode: PoShipToMode
    address: string
    /** Korean logistics hub / forwarder — used as domestic waybill Consignee (not AU address). */
    hubCompanyName?: string
    hubContactPerson?: string
    hubPhone?: string
    /** Optional link/photo of the forwarder's waybill fill-in guide. */
    waybillGuideUrl?: string
  }
  /**
   * Domestic waybill (배대지 운송장) instructions for supplier when Ship To = Korean hub.
   * Shown on Admin form + PDF so the vendor fills the hub waybill correctly.
   */
  waybillInstructions?: {
    /** Free-text how-to (editable). */
    instructionText: string
  }
  billTo: {
    name: string
    abn?: string
    address?: string
  }
  trade: {
    incoterm: PoIncoterm
    namedPlace: string
    shipmentMethod: PoShipmentMethod
  }
  payment: {
    currency: PoCurrency
    termsPreset: PoPaymentTermsPreset
    termsText: string
    supplierBank: PurchaseOrderSupplierBank
  }
  taxRule: PoTaxRule
  items: PurchaseOrderLine[]
  charges: {
    freight?: number
    insurance?: number
    other?: number
    otherLabel?: string
  }
  termsAndConditions: string
  notes?: string
  /** Optional Admin signature image URL (blank line if empty). */
  signatureImageUrl?: string
  totals: {
    subtotal: number
    tax: number
    total: number
    currency: PoCurrency
  }
}

export const PO_INCOTERMS: PoIncoterm[] = [
  'EXW',
  'FOB',
  'CIF',
  'CFR',
  'DDP',
  'FCA',
  'DAP',
  'Custom',
]

export const PO_SHIPMENT_METHODS: { value: PoShipmentMethod; label: string }[] = [
  { value: 'air', label: 'Air Freight' },
  { value: 'sea', label: 'Sea Freight' },
  { value: 'express', label: 'Express / EMS' },
]

export const PO_CURRENCIES: PoCurrency[] = ['KRW', 'USD', 'AUD', 'EUR']

export const PO_TAX_RULES: { value: PoTaxRule; label: string }[] = [
  { value: 'overseas_zero', label: 'Overseas Zero-Rated (VAT 0%)' },
  { value: 'au_gst_excluded', label: 'AU GST Excluded (10%)' },
  { value: 'au_gst_included', label: 'AU GST Included (10%)' },
]

export const PO_PACK_UNITS: { value: PoPackUnit; label: string }[] = [
  { value: 'carton', label: 'Carton (C/T)' },
  { value: 'box', label: 'Box' },
  { value: 'set', label: 'Set' },
  { value: 'pcs', label: 'Pcs / Sheet' },
]

export const PO_PAYMENT_PRESETS: {
  value: PoPaymentTermsPreset
  label: string
  termsText: string
}[] = [
  {
    value: 'advance_100',
    label: '100% Advance Payment (T/T)',
    termsText: '100% Advance Payment by Telegraphic Transfer (T/T) upon Purchase Order.',
  },
  {
    value: 'deposit_30_70_ship',
    label: '30% Deposit upon PO / 70% Before Shipment',
    termsText: '30% deposit upon Purchase Order; 70% balance payable before shipment by T/T.',
  },
  {
    value: 'deposit_30_70_bl',
    label: '30% Deposit upon PO / 70% against B/L Copy',
    termsText: '30% deposit upon Purchase Order; 70% balance payable against copy of Bill of Lading by T/T.',
  },
  {
    value: 'net_30',
    label: 'Net 30 Days',
    termsText: 'Net 30 days from invoice date by T/T.',
  },
  {
    value: 'custom',
    label: 'Custom Text',
    termsText: '',
  },
]

export const PO_SHIP_TO_MODES: { value: PoShipToMode; label: string }[] = [
  { value: 'selpic', label: 'SELPIC Warehouse (Australia)' },
  { value: 'forwarder_kr', label: 'Korean Logistics Hub / Forwarder' },
  { value: 'custom', label: 'Custom Address' },
]

/**
 * Admin helper when Ship To = Korean hub/forwarder and tax = Overseas Zero-Rated.
 * Supports supplier 0% VAT documentation expectations for domestic KR delivery of export goods.
 */
export const PO_KR_FORWARDER_ZERO_RATED_NOTE =
  'Note: For domestic delivery to a Korean forwarder/hub, export documentation (B/L, Airway Bill, or Export Declaration) will be provided to the supplier to support 0% VAT rating.'

/** Default supplier guidance for Korean hub (배대지) domestic waybill / 운송장 + outer box marks. */
export const DEFAULT_PO_WAYBILL_INSTRUCTIONS =
  'This Ship To is a Korean logistics hub (배대지), not the final Australia address.\n\n' +
  'A) Domestic courier / freight waybill TO THE HUB:\n' +
  '1) Consignee (받는 분) = Hub company name on this PO — NOT SELPIC Australia.\n' +
  '2) Address = Hub warehouse address (Ship To Address on this PO).\n' +
  '3) Phone / contact = Hub contact on this PO (required for pickup).\n' +
  '4) Shipper = Your company (Vendor).\n' +
  '5) Goods description / qty / cartons = match PO line items; follow Line Notes for split Air vs Sea boxes.\n' +
  '6) Remarks / Reference = this PO Number (mandatory for matching).\n' +
  '7) Do NOT put Australia as the destination on this domestic waybill. Final export AU docs (B/L, AWB, Export Declaration) are handled at the hub stage.\n\n' +
  'B) Outer carton marking (mandatory — marker or label on every box):\n' +
  'Even if the waybill is damaged or detached, hub staff must classify cartons from the box face. Mark each carton clearly in this format:\n' +
  '  [PO-YYYY-MM-### / SELPIC / Box N of T (AIR|SEA)]\n' +
  'Examples:\n' +
  '  [PO-2026-10-001 / SELPIC / Box 1 of 6 (AIR)]\n' +
  '  [PO-2026-10-001 / SELPIC / Box 3 of 6 (SEA)]\n' +
  'Use the real PO Number from this document. N = box sequence, T = total boxes in the shipment. AIR or SEA must match Line Notes for split shipments. Apply the same mark on at least two faces of each carton.'

/** Short checklist printed on PDF for supplier confirmation. */
export const PO_WAYBILL_CHECKLIST: string[] = [
  'Consignee = Korean hub / forwarder (not Australia)',
  'Address & phone = hub details on this PO',
  'Reference / remarks = this PO Number',
  'Every carton marked: [PO-… / SELPIC / Box N of T (AIR|SEA)]',
  'Box marks match Line Notes (Air vs Sea if split); mark ≥2 faces per carton',
  'Domestic waybill destination is the hub only — not Australia',
]

/** Compact form/PDF callouts when Ship To = Korean Logistics Hub. */
export const PO_KR_HUB_UI_NOTICES = {
  consignee:
    'Consignee must be the Korean Hub/Forwarder (NOT SELPIC Australia). Final destination "Australia" must NOT be marked on the domestic waybill.',
  poReference:
    'Include this PO Number (PO-YYYY-MM-###) in the waybill reference / remarks field so the hub can match cargo to the order.',
  boxMarking:
    'Mark every outer carton (marker or label, ≥2 faces): [PO-YYYY-MM-### / SELPIC / Box N of T (AIR|SEA)] — match Line Notes for Air vs Sea splits.',
  zeroRated:
    'Official export documents (B/L, Airway Bill, or Export Declaration) will be provided after hub processing to support 0% VAT rating.',
} as const

/** Auto-appended on PDF when tax rule is Overseas Zero-Rated (approved wording). */
export const OVERSEAS_ZERO_RATED_DISCLAIMER =
  'Prices exclude Australian GST. Overseas export transaction (VAT 0%). Import duties and Australian GST (if applicable) shall be handled by Buyer upon entry.'

export const PO_THIRTY_DAY_INSPECTION_CLAUSE =
  "Buyer shall inspect the delivered Goods within 30 days after actual delivery to Buyer's designated warehouse in Australia."

/** Default T&C: offer/acceptance + shelf-life + 30-day inspection + Qld governing law. */
export const DEFAULT_PO_TERMS_AND_CONDITIONS =
  "This Purchase Order constitutes Buyer's official offer. Supplier's written confirmation or shipment of goods constitutes acceptance under the stated terms, quantities, and pricing. All products must strictly comply with agreed specifications and shelf-life requirements.\n\n" +
  `${PO_THIRTY_DAY_INSPECTION_CLAUSE}\n\n` +
  'This Purchase Order shall be governed by and construed in accordance with the laws of Queensland, Australia, unless otherwise mutually agreed in writing by both parties.'

export function paymentTermsTextForPreset(preset: PoPaymentTermsPreset): string {
  return PO_PAYMENT_PRESETS.find((p) => p.value === preset)?.termsText ?? ''
}

export function packUnitLabel(unit: PoPackUnit, locale: PoLabelLocale = 'en'): string {
  const en = PO_PACK_UNITS.find((u) => u.value === unit)?.label ?? unit
  if (locale === 'en') return en
  const ko: Record<PoPackUnit, string> = {
    carton: '카톤 (C/T)',
    box: '박스',
    set: '세트',
    pcs: '개 / 매',
  }
  return ko[unit] ?? en
}

export function shipmentMethodLabel(
  method: PoShipmentMethod,
  locale: PoLabelLocale = 'en'
): string {
  const en = PO_SHIPMENT_METHODS.find((m) => m.value === method)?.label ?? method
  if (locale === 'en') return en
  const ko: Record<PoShipmentMethod, string> = {
    air: '항공 운송',
    sea: '해상 운송',
    express: '특송 / EMS',
  }
  return ko[method] ?? en
}

export function taxRuleLabel(rule: PoTaxRule, locale: PoLabelLocale = 'en'): string {
  const en = PO_TAX_RULES.find((t) => t.value === rule)?.label ?? rule
  if (locale === 'en') return en
  const ko: Record<PoTaxRule, string> = {
    overseas_zero: '해외 영세율 (VAT 0%)',
    au_gst_excluded: '호주 GST 별도 (10%)',
    au_gst_included: '호주 GST 포함 (10%)',
  }
  return ko[rule] ?? en
}
