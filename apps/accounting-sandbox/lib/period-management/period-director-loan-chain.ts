/**
 * Period Management — Director's Loan monthly chain (Biz Intel sister path).
 * Settings opening applies on the first DL-activity month; later months roll forward.
 * Never dump Biz Intel auto-match prior into a single month.
 */

import { calculateBusinessMetrics } from '@/lib/utils/business-calculations'
import { isDirectorsLoanLedgerTransaction } from '@/lib/classification/directors-loan-ledger'
import { toIsoDateString } from '@/lib/utils/parse-transaction-date'
import { sumDirectorFundedCashDebits, hydrateFundedByDirectorOnLedger } from '@/lib/cash-expense/funded-by-director'
import { sumDirectorReimbursementDebits } from '@/lib/classification/directors-loan-balance'

export type PeriodDirectorLoanNode = {
  periodId: string
  opening: number
  closing: number
}

function periodIdFromDate(date: string): string | null {
  const iso = toIsoDateString(date)
  return iso ? iso.slice(0, 7) : null
}

function monthKeysInclusive(fromId: string, toId: string): string[] {
  const out: string[] = []
  let [y, m] = fromId.split('-').map(Number)
  const [ey, em] = toId.split('-').map(Number)
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`)
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return out
}

/** First YYYY-MM that has a directors-loan ledger movement. */
export function firstDirectorLoanPeriodId(
  transactions: Array<{
    date: string
    category?: string
    department?: string
    isDirectorsLoan?: boolean
    fundedByDirector?: boolean
  }>
): string | null {
  const ids = transactions
    .filter((tx) => isDirectorsLoanLedgerTransaction(tx))
    .map((tx) => periodIdFromDate(tx.date))
    .filter((id): id is string => !!id)
    .sort()
  return ids[0] ?? null
}

export function formatDirectorLoanCaption(balance: number): {
  label: string
  amount: number
  role: 'company_owes' | 'director_owes' | 'none'
} {
  if (Math.abs(balance) < 0.005) {
    return { label: "Director's Loan (None)", amount: 0, role: 'none' }
  }
  if (balance > 0) {
    return {
      label: "Director's Loan (Company owes Director)",
      amount: Math.round(Math.abs(balance) * 100) / 100,
      role: 'company_owes',
    }
  }
  return {
    label: "Director's Loan (Director owes Company)",
    amount: Math.round(Math.abs(balance) * 100) / 100,
    role: 'director_owes',
  }
}

export function summarizePeriodActivity(transactions: any[]): {
  directorFundedCashAdvances: number
  reimbursementsTotal: number
  bankDirectorLoanNet: number
} {
  const directorFundedCashAdvances = sumDirectorFundedCashDebits(transactions)
  const reimbursementsTotal = sumDirectorReimbursementDebits(transactions)
  let bankDirectorLoanNet = 0
  for (const tx of transactions) {
    const cat = tx.category || ''
    if (
      cat === 'LIABILITY_DIRECTORS_LOAN' ||
      cat === 'LIABILITY_DIRECTORS_LOAN_WITHDRAWAL' ||
      tx.isDirectorsLoan
    ) {
      if (tx.credit) bankDirectorLoanNet += Math.abs(tx.credit)
      if (tx.debit) bankDirectorLoanNet -= Math.abs(tx.debit)
    }
  }
  return { directorFundedCashAdvances, reimbursementsTotal, bankDirectorLoanNet }
}

/**
 * Monthly DL chain for Period Management UI.
 * @param settingsOpening — Settings cash loan opening (applied on first DL month only)
 * @param manualPriorOnFirstMonth — optional manual prior on first DL month only (not auto-match)
 * @param throughPeriodId — optional YYYY-MM to keep rolling empty months after last TX
 *   (e.g. Jul/Aug after June reimbursement — never reset to bare Settings $1,000)
 */
export function computePeriodDirectorLoanChain(
  transactions: any[],
  settingsOpening: number,
  manualPriorOnFirstMonth: number = 0,
  throughPeriodId?: string | null
): Map<string, PeriodDirectorLoanNode> {
  transactions = hydrateFundedByDirectorOnLedger(transactions)
  const byMonth = new Map<string, any[]>()
  for (const tx of transactions) {
    const id = periodIdFromDate(tx.date)
    if (!id) continue
    if (!byMonth.has(id)) byMonth.set(id, [])
    byMonth.get(id)!.push(tx)
  }

  const firstDl = firstDirectorLoanPeriodId(transactions)
  const sortedMonths = [...byMonth.keys()].sort()
  if (sortedMonths.length === 0) return new Map()

  const start = sortedMonths[0]
  let end = sortedMonths[sortedMonths.length - 1]
  // Empty months after last ledger activity must stay on the chain (Jul/Aug case).
  if (throughPeriodId && throughPeriodId > end) {
    end = throughPeriodId
  }
  const allMonths = monthKeysInclusive(start, end)

  const chain = new Map<string, PeriodDirectorLoanNode>()
  let carry = 0
  let settingsApplied = false

  for (const periodId of allMonths) {
    const monthTxs = byMonth.get(periodId) || []
    const isFirstDlMonth = firstDl !== null && periodId === firstDl

    let opening = carry
    if (isFirstDlMonth && !settingsApplied) {
      opening = settingsOpening + (manualPriorOnFirstMonth || 0)
      settingsApplied = true
    } else if (!settingsApplied && firstDl && periodId < firstDl) {
      // Before first DL activity — show None / zero (no Settings ghost)
      opening = 0
    }

    const closing = calculateBusinessMetrics(
      monthTxs,
      opening,
      'company',
      0
    ).directorsLoanBalance

    chain.set(periodId, { periodId, opening, closing })
    carry = firstDl && periodId < firstDl ? 0 : closing
  }

  return chain
}
