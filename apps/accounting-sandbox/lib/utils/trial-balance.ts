/**
 * Trial Balance calculations — shared by Reports UI and Compliance Package export.
 */

import { calculateBusinessMetrics, type Transaction } from './business-calculations'
import {
  computeBalanceSheet,
  filterTransactionsAsAt,
  type BalanceSheetOptions,
} from './balance-sheet'
import { getCategoryDisplayName } from '@/src/shared/utils/category-mapper'
import { indexedDBStorage } from '@/lib/storage/indexed-db'

type TrialBalanceTransaction = Transaction & {
  isPayrollTransaction?: boolean
  requiresPAYG?: boolean
  noABNWarning?: { shouldWarn?: boolean; withholdingAmount?: number }
  payrollType?: string
  balance?: number | null
}

export type TrialBalanceAccountType =
  | 'Asset'
  | 'Liability'
  | 'Equity'
  | 'Revenue'
  | 'Expense'

export interface TrialBalanceRow {
  account: string
  type: TrialBalanceAccountType
  debit: number
  credit: number
}

export interface TrialBalanceResult {
  asAtDate: string
  rows: TrialBalanceRow[]
  totalDebit: number
  totalCredit: number
  isBalanced: boolean
  balanceDifference: number
}

export interface TrialBalanceOptions extends Omit<BalanceSheetOptions, 'assets'> {
  assets?: BalanceSheetOptions['assets']
}

const TYPE_ORDER: Record<TrialBalanceAccountType, number> = {
  Asset: 1,
  Liability: 2,
  Equity: 3,
  Revenue: 4,
  Expense: 5,
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

function pushDebitRow(
  rows: TrialBalanceRow[],
  account: string,
  amount: number,
  type: TrialBalanceAccountType
): void {
  const value = roundMoney(amount)
  if (value <= 0) return
  rows.push({ account, type, debit: value, credit: 0 })
}

function pushCreditRow(
  rows: TrialBalanceRow[],
  account: string,
  amount: number,
  type: TrialBalanceAccountType
): void {
  const value = roundMoney(amount)
  if (value <= 0) return
  rows.push({ account, type, debit: 0, credit: value })
}

function pushSignedEquityRow(
  rows: TrialBalanceRow[],
  account: string,
  amount: number
): void {
  const value = roundMoney(amount)
  if (Math.abs(value) < 0.005) return
  if (value >= 0) {
    pushCreditRow(rows, account, value, 'Equity')
  } else {
    pushDebitRow(rows, account, Math.abs(value), 'Equity')
  }
}

function isBusinessTransaction(
  tx: TrialBalanceTransaction,
  accountType: 'individual' | 'company' | 'sole_trader'
): boolean {
  if (accountType === 'individual') return true
  return (
    tx.department !== 'personal' &&
    tx.department !== 'unknown' &&
    (tx.department === 'cleaning' || tx.department === 'sticker' || !tx.department)
  )
}

export function groupIncomeAndExpensesByCategory(
  transactions: TrialBalanceTransaction[],
  accountType: 'individual' | 'company' | 'sole_trader' = 'company'
): { incomeByCategory: Record<string, number>; expensesByCategory: Record<string, number> } {
  const incomeByCategory: Record<string, number> = {}
  const expensesByCategory: Record<string, number> = {}

  for (const tx of transactions) {
    if (!isBusinessTransaction(tx, accountType)) continue

    const category = tx.category || 'UNCATEGORIZED'

    if (accountType === 'individual') {
      if (tx.credit && category.startsWith('INCOME_')) {
        incomeByCategory[category] =
          (incomeByCategory[category] || 0) + Math.abs(tx.credit)
      } else if (tx.debit && category.startsWith('EXPENSE_')) {
        expensesByCategory[category] =
          (expensesByCategory[category] || 0) + Math.abs(tx.debit)
      }
      continue
    }

    const isRefund =
      category === 'INCOME_REFUND_REIMBURSEMENT' ||
      (tx.description?.toUpperCase().includes('REFUND') && tx.credit)

    if (tx.credit && category.startsWith('INCOME_') && category !== 'EQUITY_SHARE_CAPITAL') {
      if (isRefund) {
        expensesByCategory[category] =
          (expensesByCategory[category] || 0) - Math.abs(tx.credit)
      } else {
        incomeByCategory[category] =
          (incomeByCategory[category] || 0) + Math.abs(tx.credit)
      }
    } else if (tx.debit && category.startsWith('EXPENSE_')) {
      expensesByCategory[category] =
        (expensesByCategory[category] || 0) + Math.abs(tx.debit)
    }
  }

  return { incomeByCategory, expensesByCategory }
}

export function computeTrialBalance(options: TrialBalanceOptions): TrialBalanceResult {
  const {
    transactions,
    openingDirectorLoanBalance = 0,
    openingCapital = 0,
    openingRetainedEarnings = 0,
    openingCashBalance = 0,
    accountType = 'company',
    assets = [],
  } = options

  const asAtDate =
    options.asAtDate || new Date().toISOString().split('T')[0]

  const balanceSheet = computeBalanceSheet({
    transactions,
    openingDirectorLoanBalance,
    openingCapital,
    openingRetainedEarnings,
    openingCashBalance,
    asAtDate,
    accountType,
    assets,
  })

  const filtered = filterTransactionsAsAt(transactions, asAtDate)
  const metrics = calculateBusinessMetrics(
    filtered,
    openingDirectorLoanBalance,
    accountType
  )

  const rows: TrialBalanceRow[] = []

  // Assets — same figures as Balance Sheet
  pushDebitRow(rows, 'Cash & Bank', balanceSheet.assets.cashAndBank, 'Asset')
  pushDebitRow(rows, 'Accounts Receivable', balanceSheet.assets.accountsReceivable, 'Asset')
  pushDebitRow(
    rows,
    "Director's Loan Receivable",
    balanceSheet.assets.directorsLoanReceivable,
    'Asset'
  )
  pushDebitRow(rows, 'Net Fixed Assets', balanceSheet.assets.netFixedAssets, 'Asset')

  // GST receivable only when BS has no GST payable and period net is a refund due
  if (balanceSheet.liabilities.gstPayable <= 0.005) {
    const periodNet = metrics.gstPayable - metrics.gstClaimable
    if (periodNet < -0.005) {
      pushDebitRow(rows, 'GST Receivable', Math.abs(periodNet), 'Asset')
    }
  }

  // Liabilities — GST Payable from BS (latest BAS due)
  pushCreditRow(rows, "Director's Loan", balanceSheet.liabilities.directorsLoan, 'Liability')
  pushCreditRow(rows, 'GST Payable', balanceSheet.liabilities.gstPayable, 'Liability')
  pushCreditRow(
    rows,
    'PAYG Withholding Payable',
    balanceSheet.liabilities.paygWithholding,
    'Liability'
  )

  // Equity openings (current CTR profit via ex-GST P&L lines below)
  pushCreditRow(rows, 'Opening Capital', balanceSheet.equity.openingCapital, 'Equity')
  pushCreditRow(rows, 'Share Capital', balanceSheet.equity.shareCapital, 'Equity')
  pushSignedEquityRow(rows, 'Opening Retained Earnings', balanceSheet.equity.openingRetainedEarnings)

  // Ex-GST P&L summaries — income - expenses = netProfitExGst (same as BS CTR RE)
  pushCreditRow(rows, 'Total income (ex GST)', metrics.totalIncomeExGst, 'Revenue')
  pushDebitRow(rows, 'Total expenses (ex GST)', metrics.totalExpensesExGst, 'Expense')
  // BAS estimate − banked ATO refund (matches BS RE debit)
  pushDebitRow(
    rows,
    'ATO GST refund rounding',
    balanceSheet.equity.atoGstRefundRounding,
    'Expense'
  )

  rows.sort((a, b) => {
    const typeDiff = TYPE_ORDER[a.type] - TYPE_ORDER[b.type]
    if (typeDiff !== 0) return typeDiff
    return a.account.localeCompare(b.account)
  })

  const totalDebit = roundMoney(rows.reduce((sum, row) => sum + row.debit, 0))
  const totalCredit = roundMoney(rows.reduce((sum, row) => sum + row.credit, 0))
  const balanceDifference = roundMoney(totalDebit - totalCredit)
  const isBalanced = Math.abs(balanceDifference) < 0.02

  return {
    asAtDate,
    rows,
    totalDebit,
    totalCredit,
    isBalanced,
    balanceDifference,
  }
}

export async function computeTrialBalanceFromStorage(
  options: Omit<TrialBalanceOptions, 'assets'>
): Promise<TrialBalanceResult> {
  const assets = await indexedDBStorage.getAllAssets()
  return computeTrialBalance({ ...options, assets })
}
