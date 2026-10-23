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
  /** Account Name / Holder (예금주). */
  accountName: string
  bankName: string
  /** Account Number / IBAN (domestic KRW or international). */
  accountNumber: string
  /** SWIFT / BIC — optional for domestic KRW transfers. */
  swiftBic?: string
  /** Bank Code / Branch Name — for domestic Korean KRW transfers. */
  bankCodeOrBranch?: string
  /**
   * Legacy combined SWIFT/account field from older drafts.
   * Prefer accountNumber + swiftBic; kept for round-trip of saved POs.
   */
  swiftOrAccount?: string
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
    /**
     * System preset id (`selpic_au` | `custom`) or synthetic
     * `forwarderId::sea|air` when using a registered KR forwarder.
     */
    presetId?: string
    /** Registered Korean forwarder id (poForwarderStore). */
    forwarderId?: string
    /** Snapshot of forwarder display name at apply time (for PDF). */
    forwarderName?: string
    /** Active transport mode when shipping via KR forwarder hub. */
    transportMode?: 'sea' | 'air'
    /**
     * Air/Sea / city identifier for carton marks
     * e.g. 브리즈번해상 — used in "SELPIC / {DEST} / PO No: …"
     */
    destinationIdentifier?: string
    /** Resolved carton mark line for this PO (may include real PO number). */
    cartonMarking?: string
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
    /** Australian Company Number — shown on a separate line from the name. */
    acn?: string
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

/** Primary Incoterms shown in the main dropdown (FOB default). */
export const PO_INCOTERMS_PRIMARY: PoIncoterm[] = ['FOB', 'FCA', 'EXW', 'DDP', 'Custom']

/** Less-used terms — under Advanced / More to reduce entry errors. */
export const PO_INCOTERMS_MORE: PoIncoterm[] = ['CIF', 'CFR', 'DAP']

/** Full list (primary first, then more) — for validation / legacy drafts. */
export const PO_INCOTERMS: PoIncoterm[] = [...PO_INCOTERMS_PRIMARY, ...PO_INCOTERMS_MORE]

/** Placeholder for Port / Designated Place linked to the selected Incoterm. */
export function namedPlacePlaceholder(incoterm: PoIncoterm): string {
  switch (incoterm) {
    case 'FOB':
      return 'Port e.g. Incheon / Busan'
    case 'FCA':
      return 'Place e.g. Hanam Hub'
    case 'EXW':
      return 'Factory / warehouse e.g. Seoul'
    case 'DDP':
      return 'Destination e.g. Brisbane warehouse'
    case 'CIF':
    case 'CFR':
      return 'Port of destination e.g. Brisbane'
    case 'DAP':
      return 'Named place e.g. Mansfield QLD'
    case 'Custom':
      return 'Named place / custom terms'
    default:
      return 'Port / Designated Place'
  }
}

/** PDF/header line: `FOB Incheon` or Custom place text. */
export function formatIncotermLine(incoterm: PoIncoterm, namedPlace: string): string {
  const place = (namedPlace || '').trim()
  if (incoterm === 'Custom') return place || 'Custom'
  return place ? `${incoterm} ${place}` : incoterm
}

/**
 * Migrate legacy `swiftOrAccount` into split fields so old drafts still print.
 * Does not overwrite populated accountNumber / swiftBic.
 */
export function normalizeSupplierBank(
  bank: PurchaseOrderSupplierBank | null | undefined
): PurchaseOrderSupplierBank {
  const raw = bank || {
    accountName: '',
    bankName: '',
    accountNumber: '',
  }
  const accountNumber = (raw.accountNumber || '').trim()
  const swiftBic = (raw.swiftBic || '').trim()
  const legacy = (raw.swiftOrAccount || '').trim()

  let nextAccount = accountNumber
  let nextSwift = swiftBic
  if (legacy && !accountNumber && !swiftBic) {
    // Heuristic: long alphanumeric with letters → treat as SWIFT; else account.
    if (/^[A-Za-z]{4}[A-Za-z]{2}[A-Za-z0-9]{2}([A-Za-z0-9]{3})?$/.test(legacy)) {
      nextSwift = legacy
    } else {
      nextAccount = legacy
    }
  }

  return {
    accountName: raw.accountName || '',
    bankName: raw.bankName || '',
    accountNumber: nextAccount,
    swiftBic: nextSwift || undefined,
    bankCodeOrBranch: (raw.bankCodeOrBranch || '').trim() || undefined,
    swiftOrAccount: legacy || undefined,
    note: raw.note,
  }
}

/** Explicit remittance reference shown under Supplier Bank on form + PDF. */
export const PO_PAYMENT_REMITTANCE_NOTE =
  'Please use the PO Number (e.g., PO-2026-XXXX) as the payment remittance reference.'

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
    // Clock starts after supplier returns signed PO by email (written acceptance).
    termsText:
      "100% Advance Payment by T/T within five (5) business days of the Supplier's written acceptance of this Purchase Order (signed PO returned by email).",
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
  "Buyer shall inspect the delivered Goods within thirty (30) business days after actual receipt at Buyer's designated warehouse in Australia and notify Supplier of any defects, damages, or short shipments."

export const PO_SHELF_LIFE_CLAUSE =
  'All Goods supplied under this Purchase Order must strictly comply with agreed specifications and maintain at least seventy percent (70%) of their total shelf-life upon arrival at Buyer\'s designated warehouse in Australia.'

export const PO_BINDING_OFFER_CLAUSE =
  "This Purchase Order constitutes Buyer's official binding offer. Supplier's written confirmation, Proforma Invoice (PI) issuance, or shipment of Goods constitutes acceptance under the stated terms, quantities, and pricing."

export const PO_GOVERNING_LAW_CLAUSE =
  'This Purchase Order shall be governed by and construed in accordance with the laws of Queensland, Australia, unless an active Master Supply Agreement between Buyer and Supplier specifies otherwise.'

/** Default T&C body only — PDF/form section heading supplies “Terms & Conditions”. */
export const DEFAULT_PO_TERMS_AND_CONDITIONS =
  `1. Binding Offer: ${PO_BINDING_OFFER_CLAUSE}\n` +
  `2. Quality & Shelf-Life: ${PO_SHELF_LIFE_CLAUSE}\n` +
  `3. Inspection Period: ${PO_THIRTY_DAY_INSPECTION_CLAUSE}\n` +
  `4. Governing Law: ${PO_GOVERNING_LAW_CLAUSE}`

export function paymentTermsTextForPreset(preset: PoPaymentTermsPreset): string {
  return PO_PAYMENT_PRESETS.find((p) => p.value === preset)?.termsText ?? ''
}

export function packUnitLabel(unit: PoPackUnit, locale: PoLabelLocale = 'en'): string {
  const stripDot = (s: string) => s.replace(/\.+$/, '').trim()
  const en = stripDot(PO_PACK_UNITS.find((u) => u.value === unit)?.label ?? String(unit || ''))
  if (locale === 'en') return en
  const ko: Record<PoPackUnit, string> = {
    carton: '카톤 (C/T)',
    box: '박스',
    set: '세트',
    pcs: '개 / 매',
  }
  return stripDot(ko[unit] ?? en)
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
