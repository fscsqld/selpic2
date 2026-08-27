/**
 * Excel export uses one bank statement (+ optional Cash Expenses for P&L period),
 * never the full merged History of every statement / payroll.
 */

import {
  isCompanyBusinessDepartment,
  normalizeCorporateTransactions,
  type LedgerAccountType,
} from '@/lib/classification/company-account'
import { applyKnownPurchaseGstTags } from '@/lib/gst/apply-known-purchase-gst'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { preferPeriodScopedRows } from '@/lib/storage/statement-transaction-scope'

export type StatementExportRow = {
  id?: string
  date: string
  description: string
  debit: number | null
  credit: number | null
  category?: string
  department?: string
  balance?: number | null
  source?: string
  isDirectorsLoan?: boolean
  isPreTradingExpense?: boolean
  isPayrollTransaction?: boolean
  requiresPAYG?: boolean
  payrollType?: 'employee' | 'director' | 'contractor' | 'partner'
  noABNWarning?: { shouldWarn?: boolean }
  gstInfo?: {
    isGSTIncluded?: boolean
    gstType?: 'INCLUDED' | 'EXCLUDED' | 'FREE'
    gstAmount?: number
    netAmount?: number
  }
}

export type StatementExportSource =
  | {
      ok: true
      statementId: string
      fileName: string
      periodLabel: string
      transactions: StatementExportRow[]
    }
  | { ok: false; error: string }

function isBankParsedRow(tx: { source?: string }): boolean {
  const source = tx.source || 'bank'
  return source === 'bank'
}

/** Add Cash Expense rows (source: manual) — not bank, payroll, or other ledger noise. */
export function isManualCashExpenseRow(tx: {
  source?: string
  id?: string
  isPayrollTransaction?: boolean
}): boolean {
  if (tx.isPayrollTransaction) return false
  if (tx.source === 'manual') return true
  const id = String(tx.id || '')
  return id.startsWith('cash_')
}

function applyBusinessFilter(
  rows: StatementExportRow[],
  accountType: LedgerAccountType,
  businessOnly: boolean
): StatementExportRow[] {
  const normalized = normalizeCorporateTransactions(rows, accountType)
  if (!businessOnly) return normalized
  return normalized.filter((tx) =>
    isCompanyBusinessDepartment(tx.department, accountType)
  )
}

function finalizeExportRows(
  raw: StatementExportRow[],
  accountType: LedgerAccountType,
  businessOnly: boolean,
  period?: { startDate?: string; endDate?: string } | null
): StatementExportRow[] {
  const bankOnly = preferPeriodScopedRows(raw.filter(isBankParsedRow), period)
  return applyBusinessFilter(bankOnly, accountType, businessOnly)
}

function rowDedupeKey(tx: StatementExportRow): string {
  if (tx.id) return `id:${tx.id}`
  return `r:${String(tx.date || '').slice(0, 10)}|${tx.description}|${tx.debit ?? ''}|${tx.credit ?? ''}|${tx.source || ''}`
}

/**
 * Merge Add Cash Expense rows into statement export when exporting a P&L window.
 * Does not pull other statements' bank rows or payroll.
 */
function mergeCashExpensesForPeriod(
  bankRows: StatementExportRow[],
  cashCandidates: StatementExportRow[] | null | undefined,
  range: { startDate: string; endDate: string },
  accountType: LedgerAccountType,
  businessOnly: boolean
): StatementExportRow[] {
  if (!cashCandidates?.length) return bankRows

  const inRange = cashCandidates.filter(
    (tx) =>
      isManualCashExpenseRow(tx) &&
      inIsoDateRange(tx.date, range.startDate, range.endDate)
  )
  const cashRows = applyBusinessFilter(inRange, accountType, businessOnly)
  if (cashRows.length === 0) return bankRows

  const seen = new Set(bankRows.map(rowDedupeKey))
  const merged = [...bankRows]
  for (const row of cashRows) {
    const key = rowDedupeKey(row)
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(row)
  }
  return merged.sort((a, b) =>
    String(a.date || '').localeCompare(String(b.date || ''))
  )
}

export type ResolveStatementExportOptions = {
  /** Fresh parse / load snapshot — preferred over possibly polluted IndexedDB rows */
  overrideTransactions?: Array<
    Omit<StatementExportRow, 'debit' | 'credit'> & {
      debit?: number | null
      credit?: number | null
    }
  > | null
  overrideFileName?: string | null
  overridePeriod?: { startDate?: string; endDate?: string } | null
  /**
   * When set (P&L banner From/To), further restrict rows to that window so exports
   * match on-screen P&L / GST for the selected period — not the whole statement PDF.
   */
  dateRangeFilter?: { startDate: string; endDate: string } | null
  /**
   * Manual Cash Expenses from the live ledger. Included only when dateRangeFilter
   * is set (P&L Period exports), so Export Business Only matches Add Cash Expense.
   */
  cashExpenses?: Array<
    Omit<StatementExportRow, 'debit' | 'credit'> & {
      debit?: number | null
      credit?: number | null
    }
  > | null
}

function inIsoDateRange(
  date: string,
  startDate: string,
  endDate: string
): boolean {
  const d = String(date || '').slice(0, 10)
  const s = String(startDate || '').slice(0, 10)
  const e = String(endDate || '').slice(0, 10)
  if (!d || !s || !e) return true
  return d >= s && d <= e
}

/**
 * Resolve the active statement for Excel export:
 * currentStatementId if set, otherwise the most recently uploaded statement.
 */
export async function resolveStatementForExcelExport(
  currentStatementId: string | null,
  accountType: LedgerAccountType,
  businessOnly: boolean,
  options: ResolveStatementExportOptions = {}
): Promise<StatementExportSource> {
  await indexedDBStorage.init()

  let statementId = currentStatementId
  if (!statementId) {
    const statements = await indexedDBStorage.getAllStatements()
    if (statements.length === 0 && !options.overrideTransactions?.length) {
      return {
        ok: false,
        error: 'No bank statement to export. Upload and parse a statement first.',
      }
    }
    if (statements.length > 0) {
      statementId = statements[0].id
    }
  }

  const statement = statementId
    ? await indexedDBStorage.getStatement(statementId)
    : null

  const rawFromOverride = options.overrideTransactions
  const raw: StatementExportRow[] =
    rawFromOverride && rawFromOverride.length > 0
      ? rawFromOverride.map((tx) => ({
          ...tx,
          debit: tx.debit ?? null,
          credit: tx.credit ?? null,
        }))
      : Array.isArray(statement?.transactions)
        ? (statement!.transactions as StatementExportRow[])
        : []

  const period = options.overridePeriod || statement?.period || null
  let filtered = finalizeExportRows(raw, accountType, businessOnly, period)

  const range = options.dateRangeFilter
  if (range?.startDate && range?.endDate) {
    filtered = filtered.filter((tx) =>
      inIsoDateRange(tx.date, range.startDate, range.endDate)
    )
    const cashNormalized: StatementExportRow[] | null = options.cashExpenses
      ? options.cashExpenses.map((tx) => ({
          ...tx,
          debit: tx.debit ?? null,
          credit: tx.credit ?? null,
        }))
      : null
    filtered = mergeCashExpensesForPeriod(
      filtered,
      cashNormalized,
      range,
      accountType,
      businessOnly
    )
  }

  if (filtered.length === 0) {
    return {
      ok: false,
      error: range?.startDate
        ? businessOnly
          ? 'No business transactions (bank or cash) in the selected P&L period.'
          : 'No transactions (bank or cash) in the selected P&L period.'
        : businessOnly
          ? 'No business transactions in the current bank statement.'
          : 'No transactions in the current bank statement.',
    }
  }

  const start = range?.startDate || period?.startDate || ''
  const end = range?.endDate || period?.endDate || ''
  const periodLabel = start && end ? `${start}_to_${end}` : 'statement'
  const fileName =
    options.overrideFileName || statement?.fileName || 'statement'

  return {
    ok: true,
    statementId: statement?.id || statementId || 'memory',
    fileName,
    periodLabel,
    // Same Hanaone-free / CrazyDomains-claim tags as Biz Intel (raw IDB may lack gstInfo)
    transactions: applyKnownPurchaseGstTags(filtered),
  }
}
