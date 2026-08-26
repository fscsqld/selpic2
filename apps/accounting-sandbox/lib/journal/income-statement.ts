/**
 * Ledger-integrated Income Statement (P&L) — aligns with GL, TB, and BS.
 */

import type { JournalEntry } from '@/src/shared/types/journal-entry'
import {
  buildGeneralLedger,
  summarizeGeneralLedgerByAccount,
} from '@/lib/journal/general-ledger'
import { classifyAccount, accountDisplayLabel } from '@/lib/journal/chart-of-accounts'
import {
  filterTransactionsForReporting,
  getActiveJournalEntries,
} from '@/lib/journal/reporting-context'
import { calculateBusinessMetrics, type Transaction } from '@/lib/utils/business-calculations'
import { getCategoryDisplayName } from '@/src/shared/utils/category-mapper'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { loadReportingContext } from '@/lib/journal/reporting-context'

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export interface IncomeStatementOptions {
  transactions: Array<{
    id?: string
    date: string
    description: string
    debit?: number | null
    credit?: number | null
    category?: string
    department?: string
    isDirectorsLoan?: boolean
    source?: string
  }>
  journalEntries?: JournalEntry[]
  excludedTransactionIds?: Set<string>
  periodStart: string
  periodEnd: string
  openingDirectorLoanBalance?: number
  accountType?: 'individual' | 'company' | 'sole_trader'
}

export interface IncomeStatementResult {
  periodStart: string
  periodEnd: string
  totalIncome: number
  totalExpenses: number
  netProfit: number
  incomeByCategory: Record<string, number>
  expensesByCategory: Record<string, number>
  ledgerIntegrated: boolean
  gstPayable: number
  gstClaimable: number
  directorsLoanBalance: number
  personalSpendingNonDeductible: number
  shareCapital: number
}

function filterTransactionsForPeriod<T extends { date: string }>(
  transactions: T[],
  periodStart: string,
  periodEnd: string
): T[] {
  return transactions.filter((tx) => tx.date >= periodStart && tx.date <= periodEnd)
}

function revenueFromLedgerRow(totalDebit: number, totalCredit: number): number {
  return roundMoney(Math.max(0, totalCredit - totalDebit))
}

function expenseFromLedgerRow(totalDebit: number, totalCredit: number): number {
  return roundMoney(Math.max(0, totalDebit - totalCredit))
}

/**
 * Build P&L from general ledger activity in the period (transactions + journals).
 */
export function computeIncomeStatementFromLedger(
  options: IncomeStatementOptions
): IncomeStatementResult {
  const {
    transactions,
    journalEntries = [],
    excludedTransactionIds = new Set(),
    periodStart,
    periodEnd,
    openingDirectorLoanBalance = 0,
    accountType = 'company',
  } = options

  const periodTransactions = filterTransactionsForPeriod(transactions, periodStart, periodEnd)
  const reportingTx = filterTransactionsForReporting(periodTransactions, excludedTransactionIds)
  const journals = getActiveJournalEntries(journalEntries)

  const lines = buildGeneralLedger(reportingTx, journals, {
    startDate: periodStart,
    endDate: periodEnd,
  })
  const summary = summarizeGeneralLedgerByAccount(lines)

  const incomeByCategory: Record<string, number> = {}
  const expensesByCategory: Record<string, number> = {}

  for (const row of summary) {
    const type = classifyAccount(row.account)
    const label =
      accountDisplayLabel(row.account) !== row.account
        ? accountDisplayLabel(row.account)
        : getCategoryDisplayName(row.account)

    if (type === 'Revenue') {
      if (row.account === 'EQUITY_SHARE_CAPITAL') continue
      const amount = revenueFromLedgerRow(row.totalDebit, row.totalCredit)
      if (amount > 0) {
        incomeByCategory[label] = (incomeByCategory[label] || 0) + amount
      }
      const contra = expenseFromLedgerRow(row.totalDebit, row.totalCredit)
      if (contra > 0) {
        expensesByCategory[label] = (expensesByCategory[label] || 0) + contra
      }
    } else if (type === 'Expense') {
      const amount = expenseFromLedgerRow(row.totalDebit, row.totalCredit)
      if (amount > 0) {
        expensesByCategory[label] = (expensesByCategory[label] || 0) + amount
      }
      const contra = revenueFromLedgerRow(row.totalDebit, row.totalCredit)
      if (contra > 0) {
        incomeByCategory[label] = (incomeByCategory[label] || 0) + contra
      }
    }
  }

  const totalIncome = roundMoney(
    Object.values(incomeByCategory).reduce((sum, value) => sum + value, 0)
  )
  const totalExpenses = roundMoney(
    Object.values(expensesByCategory).reduce((sum, value) => sum + value, 0)
  )
  const netProfit = roundMoney(totalIncome - totalExpenses)

  const supplemental = calculateBusinessMetrics(
    reportingTx as Transaction[],
    openingDirectorLoanBalance,
    accountType
  )

  return {
    periodStart,
    periodEnd,
    totalIncome,
    totalExpenses,
    netProfit,
    incomeByCategory,
    expensesByCategory,
    ledgerIntegrated: true,
    gstPayable: supplemental.gstPayable,
    gstClaimable: supplemental.gstClaimable,
    directorsLoanBalance: supplemental.directorsLoanBalance,
    personalSpendingNonDeductible: supplemental.personalSpendingNonDeductible,
    shareCapital: supplemental.shareCapital,
  }
}

/** Legacy transaction-only P&L (no journal merge). */
export function computeIncomeStatementFromTransactions(
  options: IncomeStatementOptions
): IncomeStatementResult {
  const {
    transactions,
    excludedTransactionIds = new Set(),
    periodStart,
    periodEnd,
    openingDirectorLoanBalance = 0,
    accountType = 'company',
  } = options

  const periodTransactions = filterTransactionsForPeriod(transactions, periodStart, periodEnd)
  const reportingTx = filterTransactionsForReporting(periodTransactions, excludedTransactionIds)
  const metrics = calculateBusinessMetrics(
    reportingTx as Transaction[],
    openingDirectorLoanBalance,
    accountType
  )

  const incomeByCategory: Record<string, number> = {}
  const expensesByCategory: Record<string, number> = {}

  for (const tx of reportingTx) {
    const category = tx.category || 'UNCATEGORIZED'
    const label = getCategoryDisplayName(category)

    if (accountType !== 'individual') {
      if (tx.department === 'personal' || tx.department === 'unknown') continue
    }

    if (tx.credit && category.startsWith('INCOME_') && category !== 'EQUITY_SHARE_CAPITAL') {
      incomeByCategory[label] = (incomeByCategory[label] || 0) + Math.abs(tx.credit)
    } else if (tx.debit && category.startsWith('EXPENSE_')) {
      expensesByCategory[label] = (expensesByCategory[label] || 0) + Math.abs(tx.debit)
    }
  }

  return {
    periodStart,
    periodEnd,
    totalIncome: metrics.totalIncome,
    totalExpenses: metrics.totalExpenses,
    netProfit: metrics.netProfit,
    incomeByCategory,
    expensesByCategory,
    ledgerIntegrated: false,
    gstPayable: metrics.gstPayable,
    gstClaimable: metrics.gstClaimable,
    directorsLoanBalance: metrics.directorsLoanBalance,
    personalSpendingNonDeductible: metrics.personalSpendingNonDeductible,
    shareCapital: metrics.shareCapital,
  }
}

export async function computeIncomeStatementFromStorage(
  options: Omit<IncomeStatementOptions, 'journalEntries' | 'excludedTransactionIds'>
): Promise<IncomeStatementResult> {
  const context = await loadReportingContext()
  return computeIncomeStatementFromLedger({
    ...options,
    journalEntries: context.journalEntries,
    excludedTransactionIds: context.excludedTransactionIds,
  })
}
