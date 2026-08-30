/**
 * Read-only ledger audit for the browser console: `auditLedgerDates()`.
 *
 * Answers "which statement holds my rows, and which months are they in" without
 * writing anything. Also reports rows that exist in the legacy localStorage cache
 * but not in IndexedDB — those are recoverable.
 */

import { toIsoDateString } from '@/lib/utils/parse-transaction-date'
import { indexedDBStorage } from './indexed-db'
import { loadAllTransactions } from './load-all-transactions'

interface AuditRow {
  id?: string
  date?: string
  description?: string
  debit?: number | null
  credit?: number | null
  source?: string
  isPayrollTransaction?: boolean
}

function sourceCounts(rows: AuditRow[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const row of rows) {
    const key = `${row.source ?? 'undefined'}${row.isPayrollTransaction ? '+payrollFlag' : ''}`
    out[key] = (out[key] || 0) + 1
  }
  return out
}

function monthKey(row: AuditRow): string {
  const iso = toIsoDateString(row.date)
  return iso ? iso.slice(0, 7) : `unparsed(${String(row.date ?? '')})`
}

function histogram(rows: AuditRow[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const row of rows) {
    const key = monthKey(row)
    out[key] = (out[key] || 0) + 1
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)))
}

function fingerprint(row: AuditRow): string {
  const iso = toIsoDateString(row.date) || String(row.date ?? '')
  const amount = Number(row.debit ?? 0) || Number(row.credit ?? 0) || 0
  return `${iso}|${String(row.description ?? '').trim().toUpperCase()}|${amount.toFixed(2)}`
}

export interface DateConflict {
  description: string
  amount: string
  /** Same row seen in more than one statement with a different date */
  entries: Array<{ file: string; date: string }>
  /** Same day-of-month, months exactly 3 apart — signature of the bad month+3 fold */
  monthShift3: boolean
}

/**
 * The same amount+description stored under different dates in different statements.
 * That is how a Q3 row reappears as an extra Apr–Jun row after a date fold.
 */
function findCrossStatementDateConflicts(
  statements: Array<{ fileName?: string; id: string; transactions?: unknown[] }>
): DateConflict[] {
  const groups = new Map<string, Array<{ file: string; date: string }>>()

  for (const stmt of statements) {
    const file = String(stmt.fileName || stmt.id)
    for (const raw of (stmt.transactions || []) as AuditRow[]) {
      if (raw.source === 'manual' || raw.source === 'payroll') continue
      const iso = toIsoDateString(raw.date)
      if (!iso) continue
      const amount = Math.abs(Number(raw.debit ?? 0) || Number(raw.credit ?? 0)).toFixed(2)
      const key = `${amount}|${String(raw.description ?? '').trim().toUpperCase()}`
      groups.set(key, [...(groups.get(key) || []), { file, date: iso }])
    }
  }

  const conflicts: DateConflict[] = []
  for (const [key, entries] of groups) {
    const distinctDates = new Set(entries.map((e) => e.date))
    const distinctFiles = new Set(entries.map((e) => e.file))
    if (distinctDates.size < 2 || distinctFiles.size < 2) continue

    const dates = [...distinctDates].sort()
    let monthShift3 = false
    for (let i = 0; i < dates.length; i++) {
      for (let j = i + 1; j < dates.length; j++) {
        const a = dates[i]
        const b = dates[j]
        if (a.slice(8, 10) !== b.slice(8, 10)) continue
        const months =
          (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 +
          (Number(b.slice(5, 7)) - Number(a.slice(5, 7)))
        if (Math.abs(months) === 3) monthShift3 = true
      }
    }

    const [amount, description] = key.split('|')
    conflicts.push({ description, amount, entries, monthShift3 })
  }

  return conflicts.sort((a, b) => Number(b.monthShift3) - Number(a.monthShift3))
}

function readCache(): AuditRow[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('accounting_transactions')
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as AuditRow[]) : []
  } catch {
    return []
  }
}

export async function auditLedgerDates(): Promise<{
  statements: Array<{
    file: string
    bank: string
    rows: number
    first: string
    last: string
    months: Record<string, number>
    sources: Record<string, number>
  }>
  cashExpenses: number
  cacheRows: number
  cacheOnlyRows: AuditRow[]
  loadedTotal: number
  loadedMonths: Record<string, number>
  dateConflicts: DateConflict[]
}> {
  await indexedDBStorage.init()
  const statements = await indexedDBStorage.getAllStatements()

  const perStatement = statements.map((stmt) => {
    const rows = ((stmt.transactions || []) as AuditRow[]).filter(
      (row) => row.source !== 'payroll'
    )
    const isoDates = rows
      .map((row) => toIsoDateString(row.date))
      .filter((d): d is string => !!d)
      .sort()
    return {
      file: String(stmt.fileName || stmt.id),
      bank: String(stmt.bankName || ''),
      rows: rows.length,
      first: isoDates[0] || '—',
      last: isoDates[isoDates.length - 1] || '—',
      months: histogram(rows),
      sources: sourceCounts(rows),
    }
  })

  // What the dashboard actually receives — the gap versus `months` above is the bug
  let loaded: AuditRow[] = []
  try {
    loaded = (await loadAllTransactions()) as AuditRow[]
  } catch (error) {
    console.error('[audit] loadAllTransactions threw:', error)
  }

  let cashExpenses = 0
  try {
    cashExpenses = (await indexedDBStorage.getAllCashExpenses()).length
  } catch {
    cashExpenses = -1
  }

  const stored = new Set(
    statements.flatMap((stmt) =>
      ((stmt.transactions || []) as AuditRow[]).map((row) => fingerprint(row))
    )
  )
  const cache = readCache()
  const cacheOnlyRows = cache.filter(
    (row) => row.source !== 'manual' && row.source !== 'payroll' && !stored.has(fingerprint(row))
  )

  console.log('===== Ledger date audit (read-only) =====')
  console.table(perStatement.map(({ months, ...rest }) => rest))
  for (const stmt of perStatement) {
    console.log(`${stmt.file} months:`, stmt.months)
  }
  console.log('Cash expenses in IndexedDB:', cashExpenses)
  console.log('LOADED ledger rows:', loaded.length, histogram(loaded))
  console.log('Browser cache rows:', cache.length, '| cache-only bank rows:', cacheOnlyRows.length)
  if (cacheOnlyRows.length > 0) {
    console.log('Cache-only months:', histogram(cacheOnlyRows))
  }
  // One plain line so the whole picture can be copied without expanding objects
  const summary = perStatement
    .map(
      (stmt) =>
        `${stmt.file} [${stmt.bank}] ${stmt.rows} rows ${stmt.first}..${stmt.last} ` +
        Object.entries(stmt.months)
          .map(([m, n]) => `${m}:${n}`)
          .join(' ')
    )
    .join(' || ')
  console.log(
    `SUMMARY: ${summary} || cash:${cashExpenses} cache:${cache.length} cacheOnly:${cacheOnlyRows.length}`
  )
  console.log('=========================================')

  const dateConflicts = findCrossStatementDateConflicts(statements)
  if (dateConflicts.length > 0) {
    console.log('Same row under different dates across statements:', dateConflicts)
  }

  return {
    statements: perStatement,
    cashExpenses,
    cacheRows: cache.length,
    cacheOnlyRows,
    loadedTotal: loaded.length,
    loadedMonths: histogram(loaded),
    dateConflicts,
  }
}

if (typeof window !== 'undefined') {
  ;(window as unknown as { auditLedgerDates: typeof auditLedgerDates }).auditLedgerDates =
    auditLedgerDates
}
