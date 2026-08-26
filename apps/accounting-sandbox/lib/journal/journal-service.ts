/**
 * Journal entry creation, validation, and reversal.
 */

import {
  CreateJournalEntryInput,
  JournalEntry,
  JournalLine,
} from '@/src/shared/types/journal-entry'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { assertDateNotInLockedPeriod } from '@/lib/period-management/storage-guard'

const BALANCE_TOLERANCE = 0.02

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function validateJournalLines(lines: JournalLine[]): {
  valid: boolean
  errors: string[]
  totalDebit: number
  totalCredit: number
} {
  const errors: string[] = []

  if (!lines || lines.length < 2) {
    errors.push('At least two journal lines are required.')
  }

  let totalDebit = 0
  let totalCredit = 0

  for (const [index, line] of lines.entries()) {
    if (!line.account?.trim()) {
      errors.push(`Line ${index + 1}: account is required.`)
    }

    const debit = roundMoney(line.debit || 0)
    const credit = roundMoney(line.credit || 0)

    if (debit < 0 || credit < 0) {
      errors.push(`Line ${index + 1}: amounts cannot be negative.`)
    }

    if (debit > 0 && credit > 0) {
      errors.push(`Line ${index + 1}: enter either debit or credit, not both.`)
    }

    if (debit === 0 && credit === 0) {
      errors.push(`Line ${index + 1}: debit or credit must be greater than zero.`)
    }

    totalDebit += debit
    totalCredit += credit
  }

  totalDebit = roundMoney(totalDebit)
  totalCredit = roundMoney(totalCredit)

  if (Math.abs(totalDebit - totalCredit) > BALANCE_TOLERANCE) {
    errors.push(
      `Journal is out of balance. Debits ${totalDebit.toFixed(2)} vs credits ${totalCredit.toFixed(2)}.`
    )
  }

  return {
    valid: errors.length === 0,
    errors,
    totalDebit,
    totalCredit,
  }
}

export async function createJournalEntry(
  input: CreateJournalEntryInput
): Promise<JournalEntry> {
  const validation = validateJournalLines(input.lines)
  if (!validation.valid) {
    throw new Error(validation.errors.join(' '))
  }

  await assertDateNotInLockedPeriod(input.date)

  const now = new Date().toISOString()
  const entry: JournalEntry = {
    id: `journal_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    date: input.date,
    description: input.description.trim(),
    reference: input.reference?.trim() || undefined,
    lines: input.lines.map((line) => ({
      account: line.account.trim(),
      debit: roundMoney(line.debit || 0),
      credit: roundMoney(line.credit || 0),
      description: line.description?.trim() || undefined,
    })),
    totalDebit: validation.totalDebit,
    totalCredit: validation.totalCredit,
    status: 'posted',
    source: input.source || 'manual',
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy,
  }

  await indexedDBStorage.saveJournalEntry(entry)
  return entry
}

export async function reverseJournalEntry(
  entryId: string,
  createdBy?: string
): Promise<JournalEntry> {
  const original = await indexedDBStorage.getJournalEntry(entryId)
  if (!original) {
    throw new Error('Journal entry not found.')
  }

  if (original.status === 'reversed') {
    throw new Error('This journal entry has already been reversed.')
  }

  await assertDateNotInLockedPeriod(original.date)

  const reversalDate = new Date().toISOString().split('T')[0]
  await assertDateNotInLockedPeriod(reversalDate)

  const reversal = await createJournalEntry({
    date: reversalDate,
    description: `Reversal of ${original.description}`,
    reference: original.reference ? `REV-${original.reference}` : `REV-${original.id}`,
    source: 'reversal',
    createdBy,
    lines: original.lines.map((line) => ({
      account: line.account,
      debit: line.credit,
      credit: line.debit,
      description: line.description ? `Reversal: ${line.description}` : undefined,
    })),
  })

  const updatedOriginal: JournalEntry = {
    ...original,
    status: 'reversed',
    reversedEntryId: reversal.id,
    updatedAt: new Date().toISOString(),
  }

  await indexedDBStorage.saveJournalEntry(updatedOriginal)
  return reversal
}
