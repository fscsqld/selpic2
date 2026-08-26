/**
 * Ledger-integrated financial reports — GL ↔ TB/BS single source of truth.
 */

import type { JournalEntry } from '@/src/shared/types/journal-entry'
import {
  buildGeneralLedger,
  summarizeGeneralLedgerByAccount,
} from '@/lib/journal/general-ledger'
import {
  accountDisplayLabel,
  classifyAccount,
  COA,
  isDebitNormalAccount,
} from '@/lib/journal/chart-of-accounts'
import {
  filterTransactionsForReporting,
  getActiveJournalEntries,
} from '@/lib/journal/reporting-context'
import type { AccountingBasis } from '@/lib/journal/accounting-basis'
import {
  calculateAssetDepreciation,
  filterTransactionsAsAt,
  type RegisteredAsset,
} from '@/lib/utils/balance-sheet'
import type { TrialBalanceAccountType, TrialBalanceRow } from '@/lib/utils/trial-balance'
import { getCategoryDisplayName } from '@/src/shared/utils/category-mapper'

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export interface LedgerReportOptions {
  transactions: Array<{
    id?: string
    date: string
    description: string
    debit?: number | null
    credit?: number | null
    category?: string
    reference?: string
    source?: string
  }>
  journalEntries?: JournalEntry[]
  excludedTransactionIds?: Set<string>
  asAtDate?: string
  openingCashBalance?: number
  openingCapital?: number
  openingRetainedEarnings?: number
  assets?: RegisteredAsset[]
  /** Subledger open balances — used when accrual journals may not cover full history. */
  subledgerOpenAR?: number
  subledgerOpenAP?: number
}

export interface LedgerAccountBalance {
  account: string
  accountLabel: string
  type: TrialBalanceAccountType
  totalDebit: number
  totalCredit: number
  netBalance: number
}

export interface GlReconciliationStatus {
  ledgerIntegrated: boolean
  glTotalDebit: number
  glTotalCredit: number
  trialBalanceDebit: number
  trialBalanceCredit: number
  isAligned: boolean
  difference: number
}

function resolveAsAtDate(asAtDate?: string): string {
  return asAtDate || new Date().toISOString().split('T')[0]
}

export function buildLedgerAccountBalances(
  options: LedgerReportOptions
): LedgerAccountBalance[] {
  const asAtDate = resolveAsAtDate(options.asAtDate)
  const journals = getActiveJournalEntries(options.journalEntries || [])
  const filtered = filterTransactionsAsAt(options.transactions as any, asAtDate)
  const reportingTx = filterTransactionsForReporting(
    filtered,
    options.excludedTransactionIds || new Set()
  )

  const lines = buildGeneralLedger(reportingTx, journals, { endDate: asAtDate })
  const summary = summarizeGeneralLedgerByAccount(lines)

  return summary.map((row) => ({
    account: row.account,
    accountLabel: accountDisplayLabel(row.account) || row.accountLabel,
    type: classifyAccount(row.account),
    totalDebit: row.totalDebit,
    totalCredit: row.totalCredit,
    netBalance: row.netBalance,
  }))
}

function ledgerBalanceForAccount(
  balances: LedgerAccountBalance[],
  account: string
): number {
  const row = balances.find((b) => b.account === account)
  return row?.netBalance ?? 0
}

export function ledgerBalancesToTrialBalanceRows(
  balances: LedgerAccountBalance[],
  options: {
    openingCapital?: number
    openingRetainedEarnings?: number
    netFixedAssets?: number
  } = {}
): TrialBalanceRow[] {
  const rows: TrialBalanceRow[] = []

  const pushDebit = (account: string, amount: number, type: TrialBalanceAccountType) => {
    const value = roundMoney(amount)
    if (value <= 0) return
    rows.push({ account, type, debit: value, credit: 0 })
  }

  const pushCredit = (account: string, amount: number, type: TrialBalanceAccountType) => {
    const value = roundMoney(amount)
    if (value <= 0) return
    rows.push({ account, type, debit: 0, credit: value })
  }

  for (const row of balances) {
    const label =
      row.accountLabel === row.account
        ? getCategoryDisplayName(row.account)
        : row.accountLabel

    if (isDebitNormalAccount(row.account)) {
      if (row.netBalance >= 0) {
        pushDebit(label, row.netBalance, row.type)
      } else {
        pushCredit(label, Math.abs(row.netBalance), row.type)
      }
    } else if (row.netBalance <= 0) {
      pushCredit(label, Math.abs(row.netBalance), row.type)
    } else {
      pushDebit(label, row.netBalance, row.type)
    }
  }

  if (options.netFixedAssets && options.netFixedAssets > 0) {
    const existing = rows.find((r) => r.account === 'Net Fixed Assets')
    if (!existing) {
      pushDebit('Net Fixed Assets', options.netFixedAssets, 'Asset')
    }
  }

  if (options.openingCapital && options.openingCapital > 0) {
    const hasCapital = balances.some((b) => b.account.startsWith('EQUITY_') && b.account.includes('CAPITAL'))
    if (!hasCapital) {
      pushCredit('Opening Capital', options.openingCapital, 'Equity')
    }
  }

  if (options.openingRetainedEarnings && Math.abs(options.openingRetainedEarnings) > 0.005) {
    const val = options.openingRetainedEarnings
    if (val >= 0) {
      pushCredit('Opening Retained Earnings', val, 'Equity')
    } else {
      pushDebit('Opening Retained Earnings', Math.abs(val), 'Equity')
    }
  }

  return rows
}

export function computeGlReconciliation(
  trialBalanceDebit: number,
  trialBalanceCredit: number,
  ledgerBalances: LedgerAccountBalance[]
): GlReconciliationStatus {
  const glTotalDebit = roundMoney(
    ledgerBalances.reduce((sum, row) => sum + row.totalDebit, 0)
  )
  const glTotalCredit = roundMoney(
    ledgerBalances.reduce((sum, row) => sum + row.totalCredit, 0)
  )
  const difference = roundMoney(trialBalanceDebit - trialBalanceCredit)

  return {
    ledgerIntegrated: true,
    glTotalDebit,
    glTotalCredit,
    trialBalanceDebit,
    trialBalanceCredit,
    isAligned: Math.abs(difference) < 0.02,
    difference,
  }
}

export interface LedgerBalanceSheetAdjustments {
  cashAndBank: number
  accountsReceivable: number
  accountsPayable: number
  gstPayable: number
  paygWithholding: number
  directorsLoan: number
}

/**
 * Derive BS line overrides from GL account balances + opening cash.
 */
export function computeLedgerBalanceSheetAdjustments(
  options: LedgerReportOptions
): LedgerBalanceSheetAdjustments {
  const balances = buildLedgerAccountBalances(options)
  const openingCash = options.openingCashBalance ?? 0
  const cashMovement = ledgerBalanceForAccount(balances, COA.CASH)

  const glAR = Math.max(0, ledgerBalanceForAccount(balances, COA.ACCOUNTS_RECEIVABLE))
  const glAP = Math.max(0, -ledgerBalanceForAccount(balances, COA.ACCOUNTS_PAYABLE))

  const accountsReceivable =
    options.subledgerOpenAR !== undefined
      ? options.subledgerOpenAR
      : glAR

  const accountsPayable =
    options.subledgerOpenAP !== undefined ? options.subledgerOpenAP : glAP

  return {
    cashAndBank: roundMoney(openingCash + cashMovement),
    accountsReceivable: roundMoney(accountsReceivable),
    accountsPayable: roundMoney(accountsPayable),
    gstPayable: roundMoney(Math.max(0, -ledgerBalanceForAccount(balances, COA.GST_PAYABLE))),
    paygWithholding: roundMoney(
      Math.max(0, -ledgerBalanceForAccount(balances, COA.PAYG_WITHHOLDING))
    ),
    directorsLoan: roundMoney(
      Math.max(0, -ledgerBalanceForAccount(balances, COA.DIRECTORS_LOAN))
    ),
  }
}

export function computeNetFixedAssets(
  assets: RegisteredAsset[] = [],
  asAtDate?: string
): number {
  const asAt = new Date(resolveAsAtDate(asAtDate))
  return roundMoney(
    assets.reduce((sum, asset) => {
      const depreciation = calculateAssetDepreciation(asset, asAt)
      return sum + Math.max(0, asset.purchaseAmount - depreciation)
    }, 0)
  )
}

export function shouldUseAccrualExclusions(basis: AccountingBasis): boolean {
  return basis === 'accrual'
}
