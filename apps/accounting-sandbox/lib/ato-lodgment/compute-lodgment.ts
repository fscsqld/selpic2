/**
 * Build ATO Lodgment field sets from ledger transactions.
 */

import { calculateBusinessMetrics, type Transaction } from '@/lib/utils/business-calculations'
import {
  loadDirectorLoanAdvanceSettings,
  resolvePriorPeriodDirectorAdvances,
} from '@/lib/classification/directors-loan-balance'
import { generateBASReport } from '@/lib/payg-withholding/bas-reporter'
import {
  getAustralianFinancialYear,
  getAustralianQuarterDates,
  getCurrentAustralianQuarter,
  isValidAustralianFinancialYear,
} from '@/lib/utils/australian-financial-year'
import { toIsoDateString } from '@/lib/utils/parse-transaction-date'
import { repairUsMisparsedAustralianDates } from '@/lib/utils/repair-us-misparsed-au-dates'
import { applyKnownPurchaseGstTags } from '@/lib/gst/apply-known-purchase-gst'
import { filterBankStatementTransactionsForLodgment } from '@/lib/ato-lodgment/lodgment-transaction-filter'
import { aggregateGstExclusiveByCategory } from '@/lib/gst/lodgment-gst-exclusive'
import { groupIncomeAndExpensesByCategory } from '@/lib/utils/trial-balance'
import { analyzeGstSalesBreakdown, estimatePaygInstalment } from './gst-breakdown'
import { buildCtrItem6Fields, ctrItem6LedgerCents } from './ctr-item6-fields'
import { basFieldGuide, ctrFieldGuide } from './field-guides'
import { enrichLodgmentFields } from './field-metadata'
import { buildAnnualMyTaxLedgerCents, buildMyTaxAnnualFields } from './mytax-field-map'
import { roundAtoWholeDollars } from '@/lib/utils/ato-lodgment-rounding'
import type {
  AccountTypeForLodgment,
  AnnualLodgmentResult,
  BasLodgmentResult,
  CtrLodgmentOptions,
  CtrLodgmentResult,
  LodgmentField,
  LodgmentValidation,
} from './types'

type LodgmentTransaction = Transaction & {
  category?: string
  requiresPAYG?: boolean
  isPayrollTransaction?: boolean
  payrollType?: 'employee' | 'director' | 'contractor' | 'partner'
  noABNWarning?: { shouldWarn?: boolean; withholdingAmount?: number }
  gstInfo?: {
    isGSTIncluded?: boolean
    gstType?: 'INCLUDED' | 'EXCLUDED' | 'FREE'
    gstAmount?: number
    netAmount?: number
  }
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

/** ATO BAS / tax-return labels: whole dollars, leave cents out (never round up). */
function atoLabel(n: number): number {
  return roundAtoWholeDollars(n)
}

/** Same prior-advance settings as Biz Intel / Balance Sheet (localStorage). */
function resolveLodgmentPriorAdvances(
  transactions: Array<Pick<Transaction, 'debit' | 'category'>>
): number {
  const settings = loadDirectorLoanAdvanceSettings()
  return resolvePriorPeriodDirectorAdvances(
    transactions,
    settings.manualPriorAdvances,
    settings.autoMatchReimbursements
  )
}

/**
 * Inclusive YYYY-MM-DD range filter.
 * Must use toIsoDateString — never `new Date('DD/MM/YYYY')`, which JS treats as
 * US MM/DD and drops April (01/04) into January (Q3).
 */
export function filterByDateRange<T extends { date: string }>(
  items: T[],
  start: string,
  end: string
): T[] {
  const startIso = toIsoDateString(start) || start
  const endIso = toIsoDateString(end) || end
  return items.filter((tx) => {
    const d = toIsoDateString(tx.date)
    if (!d) return false
    return d >= startIso && d <= endIso
  })
}

function countUncategorised(transactions: LodgmentTransaction[]): {
  count: number
  amount: number
} {
  let count = 0
  let amount = 0
  for (const tx of transactions) {
    if (!tx.category || tx.category === 'UNCATEGORIZED') {
      count++
      amount += Math.abs(tx.debit || tx.credit || 0)
    }
  }
  return { count, amount: roundMoney(amount) }
}

function validateBas(fields: LodgmentField[]): LodgmentValidation {
  const errors: string[] = []
  const warnings: string[] = []

  const g1 = fields.find((f) => f.id === 'G1')?.amount ?? 0
  const a1 = fields.find((f) => f.id === '1A')?.amount ?? 0
  const b1 = fields.find((f) => f.id === '1B')?.amount ?? 0
  const c1 = fields.find((f) => f.id === '1C')?.amount ?? 0
  const c7 = fields.find((f) => f.id === '7C')?.amount ?? 0
  const w1 = fields.find((f) => f.id === 'W1')?.amount ?? 0
  const w2 = fields.find((f) => f.id === 'W2')?.amount ?? 0
  const l4 = fields.find((f) => f.id === '4')?.amount ?? 0

  const expectedNet = roundMoney(a1 - b1)

  if (expectedNet >= 0) {
    if (Math.abs(c1 - expectedNet) > 0.02) {
      errors.push(`Label 1C (${c1}) should equal 1A − 1B (${expectedNet}).`)
    }
    if (c7 > 0.02) {
      warnings.push('7C should be zero when GST net is payable — use 1C instead.')
    }
  } else {
    const refund = roundMoney(Math.abs(expectedNet))
    if (Math.abs(c7 - refund) > 0.02) {
      errors.push(`Label 7C (${c7}) should equal GST refund amount (${refund}).`)
    }
    if (c1 > 0.02) {
      warnings.push('1C should be zero when claiming a GST refund — use 7C instead.')
    }
  }

  const g2 = fields.find((f) => f.id === 'G2')?.amount ?? 0
  const g3 = fields.find((f) => f.id === 'G3')?.amount ?? 0
  if (g2 + g3 > g1 + 0.02) {
    warnings.push('G2 + G3 exceeds G1 — review export and GST-free sales.')
  }

  if (g1 > 0 && a1 === 0) {
    warnings.push('G1 has sales but 1A is zero — confirm GST treatment on income transactions.')
  }

  if (Math.abs(w2 - l4) > 0.02 && w2 > 0) {
    warnings.push('W2 and label 4 usually match — review PAYG withholding totals.')
  }

  if (w1 > 0 && w2 > w1 + 0.02) {
    errors.push('W2 cannot exceed W1 — review payroll withholding totals.')
  }

  return { ok: errors.length === 0, errors, warnings }
}

function validateAnnual(
  fields: LodgmentField[],
  uncategorisedCount: number
): LodgmentValidation {
  const errors: string[] = []
  const warnings: string[] = []

  if (uncategorisedCount > 0) {
    warnings.push(
      `${uncategorisedCount} uncategorised transaction(s) in this year — review before lodging.`
    )
  }

  const income = fields.find((f) => f.id === 'MYTAX_TOTAL_INCOME')?.amount ?? 0
  const expenses = fields.find((f) => f.id === 'MYTAX_TOTAL_EXPENSES')?.amount ?? 0
  const net = fields.find((f) => f.id === 'MYTAX_NET_INCOME')?.amount ?? 0

  if (Math.abs(roundMoney(income - expenses) - net) > 0.02) {
    errors.push('Net business income does not match gross income minus expenses.')
  }

  return { ok: errors.length === 0, errors, warnings }
}

export function listRecentBasQuarters(count: number = 6): {
  quarter: 1 | 2 | 3 | 4
  financialYear: string
  label: string
  startDate: string
  endDate: string
}[] {
  const out: ReturnType<typeof listRecentBasQuarters> = []
  let ref = new Date()
  for (let i = 0; i < count; i++) {
    const fy = getAustralianFinancialYear(ref)
    const month = ref.getMonth() + 1
    let quarter: 1 | 2 | 3 | 4
    if (month >= 7 && month <= 9) quarter = 1
    else if (month >= 10 && month <= 12) quarter = 2
    else if (month >= 1 && month <= 3) quarter = 3
    else quarter = 4

    const dates = getAustralianQuarterDates(quarter, fy)
    out.push({
      quarter,
      financialYear: fy,
      label: `Q${quarter} ${fy}`,
      startDate: dates.startDateStr,
      endDate: dates.endDateStr,
    })

    // step back one quarter
    ref = new Date(dates.startDate)
    ref.setDate(ref.getDate() - 1)
  }
  return out
}

/** Recent calendar months for monthly BAS lodgment. */
export function listRecentBasMonths(count: number = 12): {
  label: string
  startDate: string
  endDate: string
  periodId: string
}[] {
  const out: ReturnType<typeof listRecentBasMonths> = []
  let ref = new Date()

  for (let i = 0; i < count; i++) {
    const year = ref.getFullYear()
    const month = ref.getMonth()
    const startDate = new Date(year, month, 1)
    const endDate = new Date(year, month + 1, 0)
    const formatLocal = (d: Date) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }
    const periodId = `${year}-${String(month + 1).padStart(2, '0')}`
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ]
    out.push({
      label: `${monthNames[month]} ${year}`,
      startDate: formatLocal(startDate),
      endDate: formatLocal(endDate),
      periodId,
    })
    ref = new Date(year, month - 1, 1)
  }
  return out
}

export function getCurrentFinancialYearRange(reference: Date = new Date()): {
  financialYear: string
  startDate: string
  endDate: string
} {
  const fy = getAustralianFinancialYear(reference)
  const [startYear, endYear] = fy.split('-').map(Number)
  return {
    financialYear: fy,
    startDate: `${startYear}-07-01`,
    endDate: `${endYear}-06-30`,
  }
}

function resolveFinancialYearRange(financialYear?: string): {
  financialYear: string
  startDate: string
  endDate: string
} {
  if (financialYear && isValidAustralianFinancialYear(financialYear)) {
    const [sy, ey] = financialYear.split('-').map(Number)
    return {
      financialYear: financialYear.trim(),
      startDate: `${sy}-07-01`,
      endDate: `${ey}-06-30`,
    }
  }
  return getCurrentFinancialYearRange()
}

export function computeBasLodgment(
  transactions: LodgmentTransaction[],
  periodStart: string,
  periodEnd: string,
  periodType: 'monthly' | 'quarterly',
  periodLabel: string,
  openingDirectorLoanBalance: number,
  accountType: AccountTypeForLodgment,
  priorPeriodDirectorAdvances?: number,
  gstRegistered: boolean = true
): BasLodgmentResult {
  // Bank/cash statement only — payroll journals belong in HR/Payroll, not BAS GST quarters
  const bankOnly = filterBankStatementTransactionsForLodgment(transactions)
  const dateSafe = repairUsMisparsedAustralianDates(bankOnly)
  const filtered = filterByDateRange(dateSafe, periodStart, periodEnd)
  const report = generateBASReport(
    filtered,
    periodStart,
    periodEnd,
    periodType,
    accountType === 'individual' ? 'company' : accountType,
    gstRegistered
  )
  const priorAdvances =
    priorPeriodDirectorAdvances ?? resolveLodgmentPriorAdvances(filtered)
  const tagged = applyKnownPurchaseGstTags(filtered)
  const metrics = calculateBusinessMetrics(
    tagged,
    openingDirectorLoanBalance,
    accountType === 'individual' ? 'company' : accountType,
    priorAdvances,
    gstRegistered
  )

  const gstBreakdown = analyzeGstSalesBreakdown(filtered)

  // Prefer Biz Intel ledger metrics (single source of truth) for G1 / 1A / 1B.
  // gst-breakdown still supplies G2/G3 and cross-checks when metrics are empty.
  // ATO labels: whole dollars (leave cents out) — ledger stays in cents elsewhere.
  const gstCollectedLedger = roundMoney(
    metrics.gstPayable > 0 ? metrics.gstPayable : gstBreakdown.gstOnSales
  )
  const gstPaidLedger = roundMoney(
    metrics.gstClaimable > 0 ? metrics.gstClaimable : gstBreakdown.gstOnPurchases
  )
  const g1Ledger = roundMoney(
    metrics.totalIncome > 0 ? metrics.totalIncome : gstBreakdown.g1TotalSalesGstInclusive
  )
  const gstNetLedger = roundMoney(gstCollectedLedger - gstPaidLedger)

  const g1 = atoLabel(g1Ledger)
  const g2 = atoLabel(gstBreakdown.g2ExportSales)
  // Do not treat ATO refunds / non-sales as G3 — only real GST-free sales
  const g3 = atoLabel(gstBreakdown.g3OtherGstFreeSales)

  const gstCollected = atoLabel(gstCollectedLedger)
  const gstPaid = atoLabel(gstPaidLedger)
  // Net from already-truncated labels (matches ATO 1A − 1B), not truncate(cents net)
  const gstNet = gstCollected - gstPaid

  const w1 = atoLabel(report.paygSummary.totalGrossPay)
  const w2 = atoLabel(report.paygSummary.totalWithholdingTax)
  const paygInstalment = atoLabel(
    estimatePaygInstalment(metrics.netProfit, periodType)
  )

  const fields: LodgmentField[] = [
    {
      id: 'G1',
      label: 'G1 — Total sales (GST inclusive)',
      description: 'Total business sales and income for the period.',
      section: 'gst',
      amount: g1,
      source: 'auto',
      guide: basFieldGuide('G1 Total sales'),
    },
    {
      id: 'G2',
      label: 'G2 — Export sales',
      description: 'GST-free export sales. Enter 0 if not applicable.',
      section: 'gst',
      amount: g2,
      source: 'auto',
      guide: basFieldGuide('G2 Export sales'),
    },
    {
      id: 'G3',
      label: 'G3 — Other GST-free sales',
      description: 'Domestic GST-free sales (not exports).',
      section: 'gst',
      amount: g3,
      source: 'auto',
      guide: basFieldGuide('G3 Other GST-free sales'),
    },
    {
      id: '1A',
      label: '1A — GST on sales',
      section: 'gst',
      amount: gstCollected,
      source: 'auto',
      guide: basFieldGuide('1A GST on sales'),
    },
    {
      id: '1B',
      label: '1B — GST on purchases',
      section: 'gst',
      amount: gstPaid,
      source: 'auto',
      guide: basFieldGuide('1B GST on purchases'),
    },
    ...(gstNet >= 0
      ? [
          {
            id: '1C',
            label: '1C — GST net payable',
            description: 'Amount payable to the ATO (1A − 1B). Whole dollars.',
            section: 'gst' as const,
            amount: gstNet,
            source: 'auto' as const,
            guide: basFieldGuide('1C'),
          },
          {
            id: '7C',
            label: '7C — GST refund',
            description: 'Leave as 0 when GST is payable.',
            section: 'gst' as const,
            amount: 0,
            source: 'auto' as const,
            guide: basFieldGuide('7C'),
          },
        ]
      : [
          {
            id: '1C',
            label: '1C — GST net payable',
            description: 'Leave as 0 when claiming a GST refund.',
            section: 'gst' as const,
            amount: 0,
            source: 'auto' as const,
            guide: basFieldGuide('1C'),
          },
          {
            id: '7C',
            label: '7C — GST refund',
            description: 'Refund amount (1B − 1A). Whole dollars.',
            section: 'gst' as const,
            amount: Math.abs(gstNet),
            source: 'auto' as const,
            guide: basFieldGuide('7C'),
          },
        ]),
    {
      id: '1E',
      label: '1E — Purchases without GST in price',
      description: 'Enter manually in ATO if applicable. Default 0.',
      section: 'gst',
      amount: 0,
      source: 'auto',
      guide: basFieldGuide('1E'),
    },
    {
      id: '1F',
      label: '1F — GST adjustments',
      description: 'Enter manually in ATO if applicable. Default 0.',
      section: 'gst',
      amount: 0,
      source: 'auto',
      guide: basFieldGuide('1F'),
    },
    {
      id: '7A',
      label: '7A — Deferred GST on imports',
      description: 'Enter manually if you defer GST on imports. Default 0.',
      section: 'gst',
      amount: 0,
      source: 'auto',
      guide: basFieldGuide('7A'),
    },
    {
      id: 'W1',
      label: 'W1 — Total salary, wages and other payments',
      section: 'payg',
      amount: w1,
      source: 'auto',
      guide: basFieldGuide('W1'),
    },
    {
      id: 'W2',
      label: 'W2 — Amount withheld from payments at W1',
      section: 'payg',
      amount: w2,
      source: 'auto',
      guide: basFieldGuide('W2'),
    },
    {
      id: '4',
      label: '4 — PAYG tax withheld',
      description: 'Usually matches W2 when reporting PAYG withholding only.',
      section: 'payg',
      amount: w2,
      source: 'auto',
      guide: basFieldGuide('4 PAYG tax withheld'),
    },
    {
      id: '5A',
      label: '5A — PAYG income tax instalment',
      description: 'Indicative instalment from profit — confirm with ATO or your tax adviser.',
      section: 'payg',
      amount: paygInstalment,
      source: 'auto',
      guide: basFieldGuide('5A PAYG income tax instalment'),
    },
    {
      id: '6A',
      label: '6A — Fuel tax credit',
      description: 'Enter manually in ATO if you claim fuel tax credits. Default 0.',
      section: 'payg',
      amount: 0,
      source: 'auto',
      guide: basFieldGuide('6A Fuel tax credit'),
    },
  ]

  const { count, amount } = countUncategorised(filtered)
  const validation = validateBas(fields)
  if (report.paygSummary.transactionCount > 0 && w1 === 0) {
    validation.errors.push(
      'Payroll transactions exist in this period but W1 is zero — review payroll mapping.'
    )
  }
  if (report.paygSummary.transactionCount > 0 && w2 === 0) {
    validation.warnings.push(
      'Payroll transactions exist in this period but W2 is zero — confirm PAYG settings and approved payroll values.'
    )
  }
  if (count > 0) {
    validation.warnings.push(
      `${count} uncategorised transaction(s) totalling ${amount} — review before lodging.`
    )
  }
  if (gstBreakdown.incomeWithoutGstTags > 0) {
    validation.warnings.push(
      `$${gstBreakdown.incomeWithoutGstTags.toFixed(2)} of income lacks GST tags — G1 uses gross amounts; confirm 1A in ATO.`
    )
  }

  return {
    kind: 'bas',
    periodLabel: periodLabel || report.period.label,
    periodStart: report.period.startDate,
    periodEnd: report.period.endDate,
    periodType,
    fields: enrichLodgmentFields(fields, 'bas'),
    validation,
    uncategorisedCount: count,
    uncategorisedAmount: amount,
    basLedgerCents: {
      g1: g1Ledger,
      gstOnSales: gstCollectedLedger,
      gstOnPurchases: gstPaidLedger,
      gstNet: gstNetLedger,
    },
  }
}

export function computeBasLodgmentForCurrentQuarter(
  transactions: LodgmentTransaction[],
  openingDirectorLoanBalance: number,
  accountType: AccountTypeForLodgment
): BasLodgmentResult {
  const q = getCurrentAustralianQuarter()
  return computeBasLodgment(
    transactions,
    q.startDateStr,
    q.endDateStr,
    'quarterly',
    `Q${q.quarter} ${q.financialYear}`,
    openingDirectorLoanBalance,
    accountType
  )
}

export function computeAnnualLodgment(
  transactions: LodgmentTransaction[],
  openingDirectorLoanBalance: number,
  accountType: AccountTypeForLodgment,
  financialYear?: string
): AnnualLodgmentResult {
  const fyRange = resolveFinancialYearRange(financialYear)

  const filtered = filterByDateRange(transactions, fyRange.startDate, fyRange.endDate)
  const bizType = accountType === 'individual' ? 'company' : accountType
  const priorAdvances = resolveLodgmentPriorAdvances(filtered)
  const metrics = calculateBusinessMetrics(
    filtered,
    openingDirectorLoanBalance,
    bizType,
    priorAdvances
  )
  const cashCategories = groupIncomeAndExpensesByCategory(filtered, bizType)
  const exGstCategories = aggregateGstExclusiveByCategory(filtered, bizType, true)
  const myTaxMetrics = {
    totalIncome: metrics.totalIncomeExGst,
    totalExpenses: metrics.totalExpensesExGst,
    netProfit: metrics.netProfitExGst,
    gstPayable: metrics.gstPayable,
    gstClaimable: metrics.gstClaimable,
  }

  // ATO Annual / myTax — per-line GST-exclusive category maps (no scaleMap).
  const fields = enrichLodgmentFields(
    buildMyTaxAnnualFields(myTaxMetrics, exGstCategories),
    'annual'
  )

  const { count } = countUncategorised(filtered)

  return {
    kind: 'annual',
    financialYear: fyRange.financialYear,
    periodStart: fyRange.startDate,
    periodEnd: fyRange.endDate,
    fields,
    validation: validateAnnual(fields, count),
    incomeByCategory: cashCategories.incomeByCategory,
    expensesByCategory: cashCategories.expensesByCategory,
    uncategorisedCount: count,
    cashTotalIncome: metrics.totalIncome,
    cashTotalExpenses: metrics.totalExpenses,
    cashNetProfit: metrics.netProfit,
    taxTotalIncome: metrics.totalIncomeExGst,
    taxTotalExpenses: metrics.totalExpensesExGst,
    taxNetProfit: metrics.netProfitExGst,
    gstOnIncome: metrics.gstPayable,
    gstOnPurchases: metrics.gstClaimable,
    annualLedgerCents: buildAnnualMyTaxLedgerCents(myTaxMetrics, exGstCategories),
  }
}

/** All four BAS quarters within an Australian financial year. */
export function getQuartersInFinancialYear(financialYear: string): {
  quarter: 1 | 2 | 3 | 4
  label: string
  startDate: string
  endDate: string
}[] {
  const safeFy = isValidAustralianFinancialYear(financialYear)
    ? financialYear.trim()
    : getCurrentFinancialYearRange().financialYear
  return ([1, 2, 3, 4] as const).map((quarter) => {
    const dates = getAustralianQuarterDates(quarter, safeFy)
    return {
      quarter,
      label: `Q${quarter} ${safeFy}`,
      startDate: dates.startDateStr,
      endDate: dates.endDateStr,
    }
  })
}

/** @alias getQuartersInFinancialYear — used by BAS quarter scoping tests. */
export const listBasQuartersInFinancialYear = getQuartersInFinancialYear

export function buildLodgmentPeriodKey(
  kind: 'bas' | 'annual' | 'ctr',
  financialYear: string,
  quarter?: number,
  monthPeriodId?: string
): string {
  if (kind === 'bas' && monthPeriodId) return `BAS-${monthPeriodId}`
  if (kind === 'bas' && quarter) return `${financialYear}-Q${quarter}`
  if (kind === 'ctr') return `CTR-FY${financialYear}`
  return `FY${financialYear}`
}

function sumPaygWithheldInFY(
  transactions: LodgmentTransaction[],
  financialYear: string
): number {
  let total = 0
  for (const q of getQuartersInFinancialYear(financialYear)) {
    const filtered = filterByDateRange(transactions, q.startDate, q.endDate)
    const report = generateBASReport(filtered, q.startDate, q.endDate, 'quarterly')
    total += report.paygSummary.totalWithholdingTax
  }
  return roundMoney(total)
}

function validateCtr(
  fields: LodgmentField[],
  uncategorisedCount: number,
  taxableIncome: number,
  estimatedTax: number
): LodgmentValidation {
  const errors: string[] = []
  const warnings: string[] = []

  const income = fields.find((f) => f.id === 'CTR_6S_TOTAL_INCOME')?.amount ?? 0
  const expenses = fields.find((f) => f.id === 'CTR_6Q_TOTAL_EXPENSES')?.amount ?? 0
  const profit = fields.find((f) => f.id === 'CTR_6T_PROFIT_LOSS')?.amount ?? 0
  const isLoss = (fields.find((f) => f.id === 'CTR_6T_PROFIT_LOSS')?.label ?? '').includes('(L)')

  if (
    Math.abs(income - expenses - (isLoss ? -profit : profit)) > 1.02
  ) {
    warnings.push(
      'Item 6S − Item 6Q does not match Item 6T — review per-line GST-ex totals.'
    )
  }

  if (uncategorisedCount > 0) {
    warnings.push(
      `${uncategorisedCount} uncategorised transaction(s) in this year — review before lodging CTR.`
    )
  }

  if (taxableIncome > 0 && estimatedTax === 0) {
    warnings.push('Taxable income is positive but estimated tax is zero — confirm your tax rate.')
  }

  return { ok: errors.length === 0, errors, warnings }
}

const DEFAULT_CTR_TAX_RATE = 0.25

/**
 * Company income tax return (CTR) copy sheet — preparation only, no SBR lodge.
 */
export function computeCtrLodgment(
  transactions: LodgmentTransaction[],
  openingDirectorLoanBalance: number,
  financialYear?: string,
  options: CtrLodgmentOptions = {}
): CtrLodgmentResult {
  const fyRange = resolveFinancialYearRange(financialYear)

  const filtered = filterByDateRange(transactions, fyRange.startDate, fyRange.endDate)
  const priorAdvances = resolveLodgmentPriorAdvances(filtered)
  const metrics = calculateBusinessMetrics(
    filtered,
    openingDirectorLoanBalance,
    'company',
    priorAdvances
  )
  const exGstCategories = aggregateGstExclusiveByCategory(filtered, 'company', true)

  const item6Input = {
    incomeByCategory: exGstCategories.incomeByCategory,
    expensesByCategory: exGstCategories.expensesByCategory,
    totalIncomeExGst: metrics.totalIncomeExGst,
    totalExpensesExGst: metrics.totalExpensesExGst,
    netProfitExGst: metrics.netProfitExGst,
  }

  const item6Fields = buildCtrItem6Fields(item6Input)

  const totalIncome = item6Fields.find((f) => f.id === 'CTR_6S_TOTAL_INCOME')?.amount ?? 0
  const totalExpenses = item6Fields.find((f) => f.id === 'CTR_6Q_TOTAL_EXPENSES')?.amount ?? 0
  const profitOrLossSigned =
    metrics.netProfitExGst >= 0
      ? item6Fields.find((f) => f.id === 'CTR_6T_PROFIT_LOSS')?.amount ?? 0
      : -(item6Fields.find((f) => f.id === 'CTR_6T_PROFIT_LOSS')?.amount ?? 0)

  const taxRate = options.taxRate ?? DEFAULT_CTR_TAX_RATE
  const addBacks = atoLabel(options.nonDeductibleAddBacks ?? 0)
  const lossApplied = atoLabel(options.lossCarryForward ?? 0)
  const otherAdj = atoLabel(options.otherAdjustments ?? 0)

  const taxableBeforeLosses = atoLabel(
    Math.max(0, profitOrLossSigned + addBacks + otherAdj)
  )
  const taxableIncome = atoLabel(Math.max(0, taxableBeforeLosses - lossApplied))

  const estimatedTax =
    taxableIncome > 0 ? atoLabel(taxableIncome * taxRate) : 0
  const paygWithheld = atoLabel(
    sumPaygWithheldInFY(transactions, fyRange.financialYear)
  )
  const taxPayableAfterCredits = atoLabel(
    Math.max(0, estimatedTax - paygWithheld)
  )

  const reconciliationFields: LodgmentField[] = [
    {
      id: 'CTR_7_TAXABLE',
      label: 'Item 7T — Taxable / net income or loss',
      description:
        'After Item 7 reconciliation adjustments. Losses print L on the ATO form.',
      section: 'tax',
      amount: taxableIncome > 0 ? taxableIncome : atoLabel(Math.abs(metrics.netProfitExGst)),
      source: 'auto',
      guide: ctrFieldGuide('Taxable income'),
      sortOrder: 90,
    },
    {
      id: 'CTR_ADD_BACKS',
      label: 'Non-deductible expenses (add-back)',
      description: 'Enter amounts not deductible for tax — increases taxable income.',
      section: 'ctr',
      amount: addBacks,
      source: 'manual',
      guide: ctrFieldGuide('Non-deductible expenses'),
    },
    {
      id: 'CTR_LOSS_CARRY',
      label: 'Prior year losses applied',
      description: 'Tax losses carried forward from earlier years.',
      section: 'ctr',
      amount: lossApplied,
      source: 'manual',
      guide: ctrFieldGuide('Prior year losses applied'),
    },
    {
      id: 'CTR_ADJUSTMENTS',
      label: 'Other reconciliation adjustments',
      description: 'Other timing or book-to-tax differences (+ or −).',
      section: 'ctr',
      amount: otherAdj,
      source: 'manual',
      guide: ctrFieldGuide('Other adjustments'),
    },
    {
      id: 'CTR_TAXABLE',
      label: 'Taxable income (after adjustments)',
      description: 'Profit + add-backs + adjustments − losses applied.',
      section: 'tax',
      amount: taxableIncome,
      source: 'auto',
      guide: ctrFieldGuide('Taxable income'),
    },
    {
      id: 'CTR_PAYG_WITHHELD',
      label: 'PAYG tax withheld (annual total from BAS)',
      description: 'Sum of label 4 / W2 across BAS periods in this financial year.',
      section: 'tax',
      amount: paygWithheld,
      source: 'auto',
      guide: ctrFieldGuide('PAYG tax withheld'),
    },
    {
      id: 'CTR_TAX_EST',
      label: `Estimated income tax (${taxRate * 100}% rate)`,
      description: 'Indicative only — confirm rate eligibility with your tax adviser.',
      section: 'tax',
      amount: estimatedTax,
      source: 'auto',
      guide: ctrFieldGuide('Tax on taxable income'),
    },
    {
      id: 'CTR_TAX_PAYABLE',
      label: 'Estimated tax payable (after PAYG withheld)',
      description: 'Estimated tax minus PAYG withheld reported on BAS.',
      section: 'summary',
      amount: taxPayableAfterCredits,
      source: 'auto',
      guide: ctrFieldGuide('Amount owing or refundable'),
    },
  ]

  const fields: LodgmentField[] = [...item6Fields, ...reconciliationFields]

  const { count } = countUncategorised(filtered)
  const enrichedFields = enrichLodgmentFields(fields, 'ctr')
  const validation = validateCtr(enrichedFields, count, taxableIncome, estimatedTax)
  if (taxRate === 0.25) {
    validation.warnings.push(
      'Using 25% base rate entity rate — confirm eligibility with your tax adviser.'
    )
  } else if (taxRate === 0.3) {
    validation.warnings.push('Using 30% standard company tax rate.')
  }

  return {
    kind: 'ctr',
    financialYear: fyRange.financialYear,
    periodStart: fyRange.startDate,
    periodEnd: fyRange.endDate,
    fields: enrichedFields,
    validation,
    uncategorisedCount: count,
    estimatedTaxRate: taxRate,
    item6LedgerCents: ctrItem6LedgerCents(item6Input),
  }
}
