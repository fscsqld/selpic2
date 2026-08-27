/**
 * General Ledger — unified view of bank/cash/payroll transactions and journal entries.
 */

import type { JournalEntry } from '@/src/shared/types/journal-entry'
import { getCategoryDisplayName } from '@/src/shared/utils/category-mapper'

export interface GeneralLedgerLine {
  id: string
  date: string
  source: 'bank' | 'manual' | 'payroll' | 'journal' | 'order'
  sourceId: string
  reference?: string
  description: string
  account: string
  accountLabel: string
  debit: number
  credit: number
  journalEntryId?: string
}

export interface GeneralLedgerOptions {
  startDate?: string
  endDate?: string
  accountFilter?: string | null
}

interface LedgerTransaction {
  id?: string
  date: string
  description: string
  debit?: number | null
  credit?: number | null
  category?: string
  reference?: string
  source?: string
}

const BANK_ACCOUNT = 'ASSET_CASH'

function accountLabel(account: string): string {
  if (account === BANK_ACCOUNT) return 'Cash & Bank'
  return getCategoryDisplayName(account)
}

function inDateRange(date: string, startDate?: string, endDate?: string): boolean {
  if (startDate && date < startDate) return false
  if (endDate && date > endDate) return false
  return true
}

function pushLine(
  lines: GeneralLedgerLine[],
  params: Omit<GeneralLedgerLine, 'accountLabel'> & { account: string }
): void {
  lines.push({
    ...params,
    accountLabel: accountLabel(params.account),
  })
}

export function transactionToLedgerLines(tx: LedgerTransaction): GeneralLedgerLine[] {
  const lines: GeneralLedgerLine[] = []
  const source = (tx.source || 'bank') as GeneralLedgerLine['source']
  const sourceId = tx.id || `${tx.date}_${tx.description}`
  const category = tx.category || 'UNCATEGORIZED'
  const debit = Math.abs(tx.debit || 0)
  const credit = Math.abs(tx.credit || 0)

  if (debit > 0) {
    pushLine(lines, {
      id: `${sourceId}_dr`,
      date: tx.date,
      source,
      sourceId,
      reference: tx.reference,
      description: tx.description,
      account: category,
      debit,
      credit: 0,
    })
    pushLine(lines, {
      id: `${sourceId}_cr_bank`,
      date: tx.date,
      source,
      sourceId,
      reference: tx.reference,
      description: `${tx.description} (bank)`,
      account: BANK_ACCOUNT,
      debit: 0,
      credit: debit,
    })
  }

  if (credit > 0) {
    pushLine(lines, {
      id: `${sourceId}_dr_bank`,
      date: tx.date,
      source,
      sourceId,
      reference: tx.reference,
      description: `${tx.description} (bank)`,
      account: BANK_ACCOUNT,
      debit: credit,
      credit: 0,
    })
    pushLine(lines, {
      id: `${sourceId}_cr`,
      date: tx.date,
      source,
      sourceId,
      reference: tx.reference,
      description: tx.description,
      account: category,
      debit: 0,
      credit,
    })
  }

  return lines
}

export function journalEntryToLedgerLines(entry: JournalEntry): GeneralLedgerLine[] {
  return entry.lines.map((line, index) => ({
    id: `${entry.id}_line_${index}`,
    date: entry.date,
    source: 'journal',
    sourceId: entry.id,
    reference: entry.reference,
    description: line.description || entry.description,
    account: line.account,
    accountLabel: accountLabel(line.account),
    debit: line.debit,
    credit: line.credit,
    journalEntryId: entry.id,
  }))
}

export function buildGeneralLedger(
  transactions: LedgerTransaction[],
  journalEntries: JournalEntry[],
  options: GeneralLedgerOptions = {}
): GeneralLedgerLine[] {
  const lines: GeneralLedgerLine[] = []

  for (const tx of transactions) {
    if (!inDateRange(tx.date, options.startDate, options.endDate)) continue
    lines.push(...transactionToLedgerLines(tx))
  }

  for (const entry of journalEntries) {
    if (entry.status !== 'posted' && entry.source !== 'reversal') continue
    if (!inDateRange(entry.date, options.startDate, options.endDate)) continue
    lines.push(...journalEntryToLedgerLines(entry))
  }

  const filtered = options.accountFilter
    ? lines.filter((line) => line.account === options.accountFilter)
    : lines

  return filtered.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return a.id.localeCompare(b.id)
  })
}

export function summarizeGeneralLedgerByAccount(
  lines: GeneralLedgerLine[]
): Array<{
  account: string
  accountLabel: string
  totalDebit: number
  totalCredit: number
  netBalance: number
}> {
  const map = new Map<
    string,
    { account: string; accountLabel: string; totalDebit: number; totalCredit: number }
  >()

  for (const line of lines) {
    const existing = map.get(line.account) || {
      account: line.account,
      accountLabel: line.accountLabel,
      totalDebit: 0,
      totalCredit: 0,
    }
    existing.totalDebit += line.debit
    existing.totalCredit += line.credit
    map.set(line.account, existing)
  }

  return Array.from(map.values())
    .map((row) => ({
      ...row,
      totalDebit: Math.round(row.totalDebit * 100) / 100,
      totalCredit: Math.round(row.totalCredit * 100) / 100,
      netBalance: Math.round((row.totalDebit - row.totalCredit) * 100) / 100,
    }))
    .sort((a, b) => a.accountLabel.localeCompare(b.accountLabel))
}
