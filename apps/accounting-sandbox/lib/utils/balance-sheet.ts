/**
 * Balance Sheet — shared by Reports UI and Compliance Package export.
 *
 * GST payable = latest BAS quarter still due (e.g. Q4). ATO bank refunds are Cash
 * (NON_TAXABLE_ATO_GST_REFUND), not a liability contra labelled “prior BAS credits”.
 * Equity: when GST Payable is on the BS (latest BAS due), Total RE = opening + CTR
 * (ex GST) − ATO refund rounding (BAS estimate − banked). Cash Net and the GST
 * bridge are reference footnotes only — not in totals.
 */

import {
  calculateBusinessMetrics,
  type Transaction,
} from './business-calculations'
import { PAYGTaxCalculator } from '@/lib/payg-withholding/tax-calculator'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { resolveOutstandingBasGstPosition } from '@/lib/gst/outstanding-bas-gst'
import {
  atoGstRefundRoundingGap,
  sumAtoGstRefundAmount,
} from '@/lib/utils/ato-gst-refund'

export interface RegisteredAsset {
  purchaseDate: string
  purchaseAmount: number
  depreciationMethod?: 'straight-line' | 'diminishing-value'
  usefulLifeYears?: number
  depreciationRate?: number
}

export interface BalanceSheetOptions {
  transactions: Transaction[]
  openingDirectorLoanBalance?: number
  openingCapital?: number
  openingRetainedEarnings?: number
  openingCashBalance?: number
  /** Inclusive cut-off (YYYY-MM-DD). Defaults to today. */
  asAtDate?: string
  accountType?: 'individual' | 'company' | 'sole_trader'
  assets?: RegisteredAsset[]
}

export interface BalanceSheetResult {
  asAtDate: string
  assets: {
    cashAndBank: number
    accountsReceivable: number
    directorsLoanReceivable: number
    totalCurrentAssets: number
    grossFixedAssets: number
    accumulatedDepreciation: number
    netFixedAssets: number
    totalAssets: number
  }
  liabilities: {
    directorsLoan: number
    /**
     * GST still due — latest BAS quarter net (same as gstPayableOutstanding).
     * Do not net settled ATO bank refunds into this line.
     */
    gstPayable: number
    /** Latest BAS quarter net payable (e.g. Q4 ~$765) */
    gstPayableOutstanding: number
    /**
     * ATO GST/BAS refund credits already in Cash & Bank (NON_TAXABLE_ATO_GST_REFUND).
     * Not a liability contra against GST payable — cash asset only; shown as a note.
     */
    atoGstRefundInCash: number
    gstLatestQuarterLabel: string | null
    paygWithholding: number
    accountsPayable?: number
    totalLiabilities: number
  }
  equity: {
    openingCapital: number
    shareCapital: number
    openingRetainedEarnings: number
    /** Tax / CTR basis (ex GST) — matches Company CTR net; also used for Total RE */
    currentPeriodProfit: number
    /** Cash / GST-inclusive P&L — reference footnote only (not in Total RE) */
    currentPeriodProfitCash: number
    /**
     * BAS ÷11 prior-credit estimate − ATO banked refund (e.g. 18.45 − 18 = 0.45).
     * Debited from Total RE so BS stays balanced when Cash holds the banked amount.
     */
    atoGstRefundRounding: number
    /** opening RE + currentPeriodProfit (CTR) − atoGstRefundRounding */
    retainedEarnings: number
    totalEquity: number
  }
  totalLiabilitiesAndEquity: number
  isBalanced: boolean
  balanceDifference: number
  ledgerIntegrated?: boolean
}

export function filterTransactionsAsAt(
  transactions: Transaction[],
  asAtDate: string
): Transaction[] {
  const end = new Date(asAtDate)
  end.setHours(23, 59, 59, 999)
  return transactions.filter((tx) => new Date(tx.date) <= end)
}

export function calculateAssetDepreciation(
  asset: RegisteredAsset,
  asAtDate: Date = new Date()
): number {
  const purchaseDate = new Date(asset.purchaseDate)
  const yearsElapsed =
    (asAtDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)

  if (yearsElapsed <= 0) return 0

  if (asset.depreciationMethod === 'straight-line') {
    const usefulLife = asset.usefulLifeYears || 5
    const annual = asset.purchaseAmount / usefulLife
    return Math.min(annual * yearsElapsed, asset.purchaseAmount)
  }

  const rate = asset.depreciationRate || 20
  let currentValue = asset.purchaseAmount
  let totalDepreciation = 0

  for (let year = 0; year < Math.floor(yearsElapsed); year++) {
    const yearDepreciation = currentValue * (rate / 100)
    totalDepreciation += yearDepreciation
    currentValue -= yearDepreciation
  }

  if (yearsElapsed % 1 > 0) {
    totalDepreciation += currentValue * (rate / 100) * (yearsElapsed % 1)
  }

  return Math.min(totalDepreciation, asset.purchaseAmount)
}

function isManualCashExpenseRow(tx: Transaction & { source?: string; id?: string }): boolean {
  if (tx.source === 'manual') return true
  return String(tx.id || '').startsWith('cash_')
}

function calculateCashBalance(
  transactions: Transaction[],
  openingCashBalance: number
): number {
  // Never treat Cash Expense balance:0 as the statement close (learned: BS cash → $0).
  const bankRows = transactions.filter((tx) => !isManualCashExpenseRow(tx as any))
  const withBalance = bankRows
    .filter(
      (tx) =>
        (tx as Transaction & { balance?: number | null }).balance !== null &&
        (tx as Transaction & { balance?: number | null }).balance !== undefined
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]

  if (
    withBalance &&
    (withBalance as Transaction & { balance?: number }).balance != null
  ) {
    return (withBalance as Transaction & { balance: number }).balance
  }

  const totalCredits = transactions
    .filter(
      (tx) =>
        tx.credit &&
        tx.category !== 'NON_TAXABLE_CASH_DEPOSIT' &&
        tx.category !== 'NON_TAXABLE_TRANSFER'
    )
    .reduce((sum, tx) => sum + Math.abs(tx.credit || 0), 0)

  const totalDebits = transactions
    .filter((tx) => tx.debit && tx.category !== 'NON_TAXABLE_TRANSFER')
    .reduce((sum, tx) => sum + Math.abs(tx.debit || 0), 0)

  return openingCashBalance + totalCredits - totalDebits
}

function calculateAccountsReceivable(transactions: Transaction[]): number {
  return transactions
    .filter(
      (tx) =>
        tx.credit &&
        (tx.category === 'INCOME_TRADING' ||
          tx.category === 'INCOME_SERVICE' ||
          tx.description?.toUpperCase().includes('RECEIVABLE') ||
          tx.description?.toUpperCase().includes('OUTSTANDING') ||
          tx.description?.toUpperCase().includes('PENDING') ||
          tx.description?.toUpperCase().includes('UNPAID'))
    )
    .reduce((sum, tx) => sum + Math.abs(tx.credit || 0), 0)
}

function calculatePaygWithholdingLiability(transactions: Transaction[]): number {
  const taxCalculator = new PAYGTaxCalculator()
  let total = 0

  for (const tx of transactions) {
    if (!tx.isPayrollTransaction && !tx.requiresPAYG) continue

    const grossAmount = Math.abs(tx.debit || tx.credit || 0)
    const txAny = tx as Transaction & {
      noABNWarning?: { shouldWarn?: boolean; withholdingAmount?: number }
      payrollType?: string
    }

    if (txAny.noABNWarning?.shouldWarn && txAny.noABNWarning.withholdingAmount) {
      total += txAny.noABNWarning.withholdingAmount
    } else if (txAny.payrollType === 'director') {
      total += taxCalculator.calculateDirectorFee(grossAmount)
    } else if (txAny.payrollType === 'employee') {
      total += taxCalculator.calculateEmployeeSalary(grossAmount, true)
    } else if (txAny.payrollType === 'contractor') {
      total += taxCalculator.calculateContractorFee(grossAmount, true)
    } else if (txAny.payrollType === 'partner') {
      total += taxCalculator.calculateNoABNWithholding(grossAmount)
    }
  }

  return total
}

function resolveAsAtDate(asAtDate?: string): string {
  if (asAtDate) return asAtDate
  return new Date().toISOString().split('T')[0]
}

export function computeBalanceSheet(
  options: BalanceSheetOptions
): BalanceSheetResult {
  const {
    transactions,
    openingDirectorLoanBalance = 0,
    openingCapital = 0,
    openingRetainedEarnings = 0,
    openingCashBalance = 0,
    accountType = 'company',
    assets = [],
  } = options

  const asAtDate = resolveAsAtDate(options.asAtDate)
  const asAt = new Date(asAtDate)
  const filtered = filterTransactionsAsAt(transactions, asAtDate)

  const metrics = calculateBusinessMetrics(
    filtered,
    openingDirectorLoanBalance,
    accountType
  )

  const cashAndBank = calculateCashBalance(filtered, openingCashBalance)
  const accountsReceivable = calculateAccountsReceivable(filtered)

  const directorsLoanReceivable =
    metrics.directorsLoanBalance < 0
      ? Math.abs(metrics.directorsLoanBalance)
      : 0
  const directorsLoanLiability = Math.max(0, metrics.directorsLoanBalance)

  const grossFixedAssets = assets.reduce((sum, a) => sum + a.purchaseAmount, 0)
  const accumulatedDepreciation = assets.reduce(
    (sum, asset) => sum + calculateAssetDepreciation(asset, asAt),
    0
  )
  const netFixedAssets = assets.reduce((sum, asset) => {
    const depreciation = calculateAssetDepreciation(asset, asAt)
    return sum + Math.max(0, asset.purchaseAmount - depreciation)
  }, 0)

  const totalCurrentAssets =
    cashAndBank + accountsReceivable + directorsLoanReceivable
  const totalAssets = totalCurrentAssets + netFixedAssets

  const gstPosition = resolveOutstandingBasGstPosition(
    filtered,
    asAtDate,
    accountType
  )
  // Liability = latest BAS still due (e.g. Q4). ATO bank refunds stay in Cash —
  // do not subtract them here as "prior BAS credits".
  const gstPayable =
    gstPosition.outstandingPayable > 0
      ? gstPosition.outstandingPayable
      : gstPosition.periodNetPayable
  const atoGstRefundInCash = sumAtoGstRefundAmount(filtered)
  // BAS ÷11 prior-credit estimate vs ATO banked (e.g. 18.45 − 18 = 0.45)
  const atoGstRefundRounding = atoGstRefundRoundingGap(
    atoGstRefundInCash,
    gstPosition.settledPriorCreditsInPeriod
  )
  const paygWithholding = calculatePaygWithholdingLiability(filtered)

  const totalLiabilities =
    directorsLoanLiability + gstPayable + paygWithholding

  const currentPeriodProfitCash = metrics.netProfit
  const currentPeriodProfit = metrics.netProfitExGst
  // GST Payable is already a liability — Total RE uses CTR (ex GST), then less ATO rounding.
  const retainedEarnings =
    openingRetainedEarnings + currentPeriodProfit - atoGstRefundRounding
  const shareCapital = metrics.shareCapital || 0
  const totalEquity = openingCapital + shareCapital + retainedEarnings

  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity
  const balanceDifference = totalAssets - totalLiabilitiesAndEquity
  const isBalanced = Math.abs(balanceDifference) < 0.02

  return {
    asAtDate,
    assets: {
      cashAndBank,
      accountsReceivable,
      directorsLoanReceivable,
      totalCurrentAssets,
      grossFixedAssets,
      accumulatedDepreciation,
      netFixedAssets,
      totalAssets,
    },
    liabilities: {
      directorsLoan: directorsLoanLiability,
      gstPayable,
      gstPayableOutstanding: gstPosition.outstandingPayable,
      atoGstRefundInCash,
      gstLatestQuarterLabel: gstPosition.latestQuarter?.label ?? null,
      paygWithholding,
      accountsPayable: 0,
      totalLiabilities,
    },
    equity: {
      openingCapital,
      shareCapital,
      openingRetainedEarnings,
      currentPeriodProfit,
      currentPeriodProfitCash,
      atoGstRefundRounding,
      retainedEarnings,
      totalEquity,
    },
    totalLiabilitiesAndEquity,
    isBalanced,
    balanceDifference,
    ledgerIntegrated: false,
  }
}

/** Load registered assets from IndexedDB and compute balance sheet. */
export async function computeBalanceSheetFromStorage(
  options: Omit<BalanceSheetOptions, 'assets'>
): Promise<BalanceSheetResult> {
  const assets = (await indexedDBStorage.getAllAssets()) as RegisteredAsset[]
  return computeBalanceSheet({ ...options, assets })
}
