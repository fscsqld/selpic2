/**
 * Manual and system journal entry types for double-entry bookkeeping.
 */

export interface JournalLine {
  account: string
  debit: number
  credit: number
  description?: string
}

export type JournalEntryStatus = 'posted' | 'reversed'
export type JournalEntrySource = 'manual' | 'payroll' | 'reversal' | 'system'

export interface JournalEntry {
  id: string
  date: string
  description: string
  reference?: string
  lines: JournalLine[]
  totalDebit: number
  totalCredit: number
  status: JournalEntryStatus
  source: JournalEntrySource
  reversedEntryId?: string
  createdAt: string
  updatedAt: string
  createdBy?: string
}

export interface CreateJournalEntryInput {
  date: string
  description: string
  reference?: string
  lines: JournalLine[]
  source?: JournalEntrySource
  createdBy?: string
}
