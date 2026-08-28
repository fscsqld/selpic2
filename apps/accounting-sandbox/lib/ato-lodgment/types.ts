/**
 * ATO Lodgment Guide — types for copy-and-enter workflow (no electronic lodge).
 */

export type LodgmentTab = 'bas' | 'annual' | 'ctr' | 'individual'

export type AccountTypeForLodgment = 'individual' | 'company' | 'sole_trader'

/** Bank-derived hints for personal myTax (advisory; payment summaries remain authoritative). */
export interface IndividualBankHints {
  salaryDeposits: number
  interest: number
  dividends: number
  govtPayments: number
  businessIncome: number
  otherIncome: number
  workDeductions: number
  giftsDonations: number
  taxAffairs: number
  otherDeductions: number
  paygWithheldHint: number
}

export interface IndividualLodgmentResult {
  kind: 'individual'
  financialYear: string
  periodStart: string
  periodEnd: string
  fields: LodgmentField[]
  validation: LodgmentValidation
  uncategorisedCount: number
  bankHints: IndividualBankHints
}

export interface ATOFieldGuide {
  /** Steps shown in the "Where in ATO" panel (English, matches ATO UI). */
  atoPortal: 'osb' | 'mytax' | 'either'
  atoSteps: string[]
  helpUrl?: string
}

export type FieldEntryKind = 'auto' | 'review' | 'manual'

export interface LodgmentField {
  id: string
  label: string
  description?: string
  section: 'gst' | 'payg' | 'income' | 'expense' | 'summary' | 'ctr' | 'tax'
  amount: number
  source: 'auto' | 'manual'
  guide: ATOFieldGuide
  /** When true, show as informational only (no amount to copy). */
  readOnly?: boolean
  myTaxLabel?: string
  entryKind?: FieldEntryKind
  atoScreenPath?: string
  sortOrder?: number
}

export interface LodgmentValidation {
  ok: boolean
  errors: string[]
  warnings: string[]
}

export interface BasLodgmentResult {
  kind: 'bas'
  periodLabel: string
  periodStart: string
  periodEnd: string
  periodType: 'monthly' | 'quarterly'
  fields: LodgmentField[]
  validation: LodgmentValidation
  uncategorisedCount: number
  uncategorisedAmount: number
}

export interface AnnualLodgmentResult {
  kind: 'annual'
  financialYear: string
  periodStart: string
  periodEnd: string
  fields: LodgmentField[]
  validation: LodgmentValidation
  incomeByCategory: Record<string, number>
  expensesByCategory: Record<string, number>
  uncategorisedCount: number
  /** GST-inclusive cash (Biz Intel) */
  cashTotalIncome?: number
  cashTotalExpenses?: number
  cashNetProfit?: number
  /** GST-exclusive tax basis (ATO Annual / myTax / CTR) */
  taxTotalIncome?: number
  taxTotalExpenses?: number
  taxNetProfit?: number
  gstOnIncome?: number
  gstOnPurchases?: number
}

export interface CtrLodgmentOptions {
  taxRate?: number
  nonDeductibleAddBacks?: number
  lossCarryForward?: number
  otherAdjustments?: number
}

export interface CtrLodgmentResult {
  kind: 'ctr'
  financialYear: string
  periodStart: string
  periodEnd: string
  fields: LodgmentField[]
  validation: LodgmentValidation
  uncategorisedCount: number
  estimatedTaxRate: number
  /** L2 cents for Item 6 reconciliation (ledger vs ATO whole $). */
  item6LedgerCents?: {
    totalIncome: number
    totalExpenses: number
    profitOrLoss: number
    motor: number
  }
}

export type LodgmentResult =
  | BasLodgmentResult
  | AnnualLodgmentResult
  | CtrLodgmentResult
  | IndividualLodgmentResult
