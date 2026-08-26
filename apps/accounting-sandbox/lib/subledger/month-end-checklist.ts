/**
 * Month-end closing checklist builder.
 */

import type { FinancialPeriod } from '@/lib/storage/period-types'
import { getSubledgerBalances } from './ar-ap-service'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { getDefaultReconciliationPeriodId } from './bank-reconciliation'
import { isManualCashExpenseTx } from '@/lib/dashboard/view-period-range'
import { toIsoDateString } from '@/lib/utils/parse-transaction-date'

export type MonthEndTaskStatus = 'pending' | 'warning' | 'done'

export interface MonthEndTask {
  id: string
  label: string
  status: MonthEndTaskStatus
  count?: number
  detail?: string
}

export interface MonthEndChecklistResult {
  periodId: string
  tasks: MonthEndTask[]
  readyToClose: boolean
  blockingCount: number
}

interface TransactionLike {
  id?: string
  date: string
  category?: string
  description?: string
  source?: string
}

function isInPeriod(txDate: string, periodId: string): boolean {
  const iso = toIsoDateString(txDate) || txDate
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  return iso.startsWith(periodId)
}

/**
 * Month-End Period picker default.
 * Do NOT use FY reporting start (e.g. 2025-07) when that month has no ledger rows —
 * prefer the latest month that actually has bank/cash activity.
 */
export function resolveMonthEndPeriodId(
  transactions: Array<{ date: string }>,
  preferredPeriodId?: string | null
): string {
  const monthsWithActivity = new Set<string>()
  let latestMonth: string | null = null
  for (const tx of transactions) {
    const iso = toIsoDateString(tx.date) || tx.date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) continue
    const month = iso.slice(0, 7)
    monthsWithActivity.add(month)
    if (!latestMonth || month > latestMonth) latestMonth = month
  }

  if (
    preferredPeriodId &&
    /^\d{4}-\d{2}$/.test(preferredPeriodId) &&
    monthsWithActivity.has(preferredPeriodId)
  ) {
    return preferredPeriodId
  }

  if (latestMonth) return latestMonth
  return getDefaultReconciliationPeriodId()
}

export async function buildMonthEndChecklist(
  transactions: TransactionLike[],
  periods: FinancialPeriod[],
  periodId: string = getDefaultReconciliationPeriodId()
): Promise<MonthEndChecklistResult> {
  const periodTransactions = transactions.filter((tx) => isInPeriod(tx.date, periodId))

  /** Bank statement lines only — Cash Expense is never on the bank PDF. */
  const bankPeriodTransactions = periodTransactions.filter((tx) => !isManualCashExpenseTx(tx))

  const uncategorized = periodTransactions.filter(
    (tx) => !tx.category || tx.category === 'UNCATEGORIZED'
  )

  const period = periods.find((p) => p.id === periodId)
  const isLocked = period?.isLocked ?? false

  const recon = await indexedDBStorage.getBankReconciliationByPeriod(periodId)
  const uncleared =
    recon == null
      ? bankPeriodTransactions.length
      : bankPeriodTransactions.filter((tx, index) => {
          const key = tx.id || `${tx.date}_${index}_${tx.description}`
          return !recon.clearedTransactionIds.includes(key)
        }).length

  const subledger = await getSubledgerBalances()

  let pendingTimesheets = 0
  try {
    const timesheets = await indexedDBStorage.getAllTimesheets(undefined, 'submitted')
    pendingTimesheets = timesheets.length
  } catch {
    pendingTimesheets = 0
  }

  const tasks: MonthEndTask[] = [
    {
      id: 'categorize',
      label: 'Categorize all transactions',
      status: uncategorized.length === 0 ? 'done' : uncategorized.length <= 5 ? 'warning' : 'pending',
      count: uncategorized.length,
      detail:
        uncategorized.length === 0
          ? 'All period transactions are categorized.'
          : `${uncategorized.length} transaction(s) still need a category.`,
    },
    {
      id: 'bank-recon',
      label: 'Complete bank reconciliation',
      status:
        recon?.status === 'completed'
          ? 'done'
          : bankPeriodTransactions.length === 0
            ? 'done'
            : uncleared === 0
              ? 'warning'
              : 'pending',
      count: bankPeriodTransactions.length === 0 ? 0 : uncleared,
      detail:
        recon?.status === 'completed'
          ? `Reconciliation completed with ${formatDiff(recon.difference)} difference.`
          : bankPeriodTransactions.length === 0
            ? 'No bank-statement lines this month (Cash Expense only is OK — mark period lock when ready).'
            : `${uncleared} bank transaction(s) not marked cleared.`,
    },
    {
      id: 'open-ar',
      label: 'Review open receivables',
      status: subledger.openAR === 0 ? 'done' : subledger.overdueAR > 0 ? 'pending' : 'warning',
      count: subledger.overdueAR > 0 ? undefined : subledger.openAR,
      detail:
        subledger.openAR === 0
          ? 'No open customer invoices.'
          : `Open AR ${subledger.openAR.toFixed(2)}` +
            (subledger.overdueAR > 0 ? ` · overdue ${subledger.overdueAR.toFixed(2)}` : ''),
    },
    {
      id: 'open-ap',
      label: 'Review open payables',
      status: subledger.openAP === 0 ? 'done' : subledger.overdueAP > 0 ? 'pending' : 'warning',
      count: subledger.overdueAP > 0 ? undefined : subledger.openAP,
      detail:
        subledger.openAP === 0
          ? 'No open vendor bills.'
          : `Open AP ${subledger.openAP.toFixed(2)}` +
            (subledger.overdueAP > 0 ? ` · overdue ${subledger.overdueAP.toFixed(2)}` : ''),
    },
    {
      id: 'payroll',
      label: 'Approve submitted timesheets',
      status: pendingTimesheets === 0 ? 'done' : 'warning',
      count: pendingTimesheets,
      detail:
        pendingTimesheets === 0
          ? 'No submitted timesheets waiting for approval.'
          : `${pendingTimesheets} timesheet(s) awaiting approval.`,
    },
    {
      id: 'lock-period',
      label: 'Lock accounting period',
      status: isLocked ? 'done' : 'pending',
      detail: isLocked
        ? `Period ${periodId} is locked.`
        : `Period ${periodId} is still open for edits.`,
    },
  ]

  const blockingCount = tasks.filter((task) => task.status === 'pending').length

  return {
    periodId,
    tasks,
    blockingCount,
    readyToClose: blockingCount === 0,
  }
}

function formatDiff(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}`
}
