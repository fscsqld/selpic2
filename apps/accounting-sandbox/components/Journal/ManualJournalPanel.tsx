'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Save, RotateCcw, BookOpen, AlertCircle } from 'lucide-react'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import {
  createJournalEntry,
  reverseJournalEntry,
  validateJournalLines,
} from '@/lib/journal/journal-service'
import type { JournalEntry, JournalLine } from '@/src/shared/types/journal-entry'
import { formatCurrency } from '@/lib/utils/currency-format'
import { formatDateAustralian } from '@/lib/utils/date-format'
import { PeriodLockedError } from '@/lib/period-management/storage-guard'

const COMMON_ACCOUNTS = [
  'ASSET_CASH',
  'EXPENSE_WAGES_SALARIES',
  'EXPENSE_DIRECTORS_FEES',
  'EXPENSE_SUPERANNUATION',
  'EXPENSE_DEPRECIATION',
  'EXPENSE_OFFICE_SUPPLIES',
  'LIABILITY_PAYG_WITHHOLDING',
  'LIABILITY_SUPERANNUATION',
  'LIABILITY_GST_PAYABLE',
  'LIABILITY_DIRECTORS_LOAN',
  'EQUITY_RETAINED_EARNINGS',
  'INCOME_SALES',
  'INCOME_OTHER',
]

function emptyLine(): JournalLine {
  return { account: '', debit: 0, credit: 0, description: '' }
}

interface ManualJournalPanelProps {
  onJournalChanged?: () => void
}

export function ManualJournalPanel({ onJournalChanged }: ManualJournalPanelProps) {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [reference, setReference] = useState('')
  const [lines, setLines] = useState<JournalLine[]>([emptyLine(), emptyLine()])

  const validation = validateJournalLines(lines)

  const loadEntries = async () => {
    setIsLoading(true)
    try {
      await indexedDBStorage.init()
      const rows = await indexedDBStorage.getAllJournalEntries()
      setEntries(rows.filter((entry) => entry.source === 'manual' || entry.source === 'reversal'))
    } catch (err) {
      console.error('Failed to load journal entries:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadEntries()
  }, [])

  const updateLine = (index: number, patch: Partial<JournalLine>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)))
  }

  const addLine = () => setLines((prev) => [...prev, emptyLine()])

  const removeLine = (index: number) => {
    if (lines.length <= 2) return
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  const resetForm = () => {
    setDate(new Date().toISOString().split('T')[0])
    setDescription('')
    setReference('')
    setLines([emptyLine(), emptyLine()])
    setError(null)
  }

  const handleSave = async () => {
    setError(null)
    setSuccess(null)

    if (!description.trim()) {
      setError('Description is required.')
      return
    }

    if (!validation.valid) {
      setError(validation.errors.join(' '))
      return
    }

    setIsSaving(true)
    try {
      await createJournalEntry({
        date,
        description,
        reference: reference || undefined,
        lines,
        source: 'manual',
      })
      setSuccess('Journal entry posted successfully.')
      resetForm()
      await loadEntries()
      onJournalChanged?.()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('transactionsUpdated'))
      }
    } catch (err: any) {
      if (err instanceof PeriodLockedError) {
        setError(err.message)
      } else {
        setError(err?.message || 'Failed to post journal entry.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleReverse = async (entryId: string) => {
    if (!window.confirm('Create a reversing journal entry for this posting?')) return

    setError(null)
    setSuccess(null)
    try {
      await reverseJournalEntry(entryId)
      setSuccess('Reversing journal entry created.')
      await loadEntries()
      onJournalChanged?.()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('transactionsUpdated'))
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to reverse journal entry.')
    }
  }

  return (
    <div className="card space-y-6">
      <div className="flex items-center gap-2">
        <BookOpen className="w-6 h-6 text-indigo-600" />
        <div>
          <h2 className="text-2xl font-semibold">Manual Journal Entries</h2>
          <p className="text-sm text-gray-600">
            Post adjusting entries for depreciation, accruals, prepayments, and year-end adjustments.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Monthly depreciation adjustment"
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div className="md:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Reference (optional)</label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. ADJ-2026-03"
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Account</th>
              <th className="px-3 py-2 text-left">Line description</th>
              <th className="px-3 py-2 text-right">Debit</th>
              <th className="px-3 py-2 text-right">Credit</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={index} className="border-t border-gray-100">
                <td className="px-3 py-2">
                  <input
                    list="journal-account-options"
                    value={line.account}
                    onChange={(e) => updateLine(index, { account: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5"
                    placeholder="Account code"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={line.description || ''}
                    onChange={(e) => updateLine(index, { description: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.debit || ''}
                    onChange={(e) =>
                      updateLine(index, {
                        debit: Number(e.target.value) || 0,
                        credit: 0,
                      })
                    }
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-right"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.credit || ''}
                    onChange={(e) =>
                      updateLine(index, {
                        credit: Number(e.target.value) || 0,
                        debit: 0,
                      })
                    }
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-right"
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    className="text-red-600 hover:text-red-800"
                    disabled={lines.length <= 2}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <datalist id="journal-account-options">
          {COMMON_ACCOUNTS.map((account) => (
            <option key={account} value={account} />
          ))}
        </datalist>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-600">
          Debits: <strong>{formatCurrency(validation.totalDebit)}</strong> · Credits:{' '}
          <strong>{formatCurrency(validation.totalCredit)}</strong>
          {!validation.valid && (
            <span className="ml-2 text-red-600">Out of balance</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={addLine}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
          >
            <Plus className="w-4 h-4" />
            Add line
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !validation.valid}
            className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-300"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Posting...' : 'Post journal'}
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Recent manual journals</h3>
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading journal entries...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-gray-500">No manual journal entries yet.</p>
        ) : (
          <div className="space-y-3">
            {entries.slice(0, 8).map((entry) => (
              <div key={entry.id} className="rounded-lg border border-gray-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">{entry.description}</p>
                    <p className="text-sm text-gray-600">
                      {formatDateAustralian(entry.date)}
                      {entry.reference ? ` · ${entry.reference}` : ''}
                      {' · '}
                      {entry.status === 'reversed' ? 'Reversed' : entry.source}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p>Dr {formatCurrency(entry.totalDebit)}</p>
                    <p>Cr {formatCurrency(entry.totalCredit)}</p>
                  </div>
                </div>
                {entry.status === 'posted' && entry.source === 'manual' && (
                  <button
                    type="button"
                    onClick={() => handleReverse(entry.id)}
                    className="mt-3 text-sm text-orange-700 hover:text-orange-900"
                  >
                    Reverse entry
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
