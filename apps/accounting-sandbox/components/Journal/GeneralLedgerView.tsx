'use client'

import { useEffect, useMemo, useState } from 'react'
import { BookOpenCheck, Download } from 'lucide-react'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import {
  buildGeneralLedger,
  summarizeGeneralLedgerByAccount,
  type GeneralLedgerLine,
} from '@/lib/journal/general-ledger'
import type { JournalEntry } from '@/src/shared/types/journal-entry'
import { formatCurrency } from '@/lib/utils/currency-format'
import { formatDateAustralian } from '@/lib/utils/date-format'

interface GeneralLedgerViewProps {
  transactions: Array<{
    id?: string
    date: string
    description: string
    debit: number | null
    credit: number | null
    category?: string
    reference?: string
    source?: 'bank' | 'manual' | 'payroll' | 'order' | 'journal'
  }>
}

type DatePreset = 'month' | 'quarter' | 'year' | 'all'

function getPresetRange(preset: DatePreset): { startDate?: string; endDate?: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  if (preset === 'all') return {}

  if (preset === 'month') {
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 0)
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    }
  }

  if (preset === 'quarter') {
    const quarterStartMonth = Math.floor(month / 3) * 3
    const start = new Date(year, quarterStartMonth, 1)
    const end = new Date(year, quarterStartMonth + 3, 0)
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    }
  }

  const fyStartYear = month >= 6 ? year : year - 1
  return {
    startDate: `${fyStartYear}-07-01`,
    endDate: `${fyStartYear + 1}-06-30`,
  }
}

export function GeneralLedgerView({ transactions }: GeneralLedgerViewProps) {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([])
  const [preset, setPreset] = useState<DatePreset>('month')
  const [accountFilter, setAccountFilter] = useState<string>('')

  useEffect(() => {
    const loadJournals = async () => {
      try {
        await indexedDBStorage.init()
        const entries = await indexedDBStorage.getAllJournalEntries()
        setJournalEntries(entries)
      } catch (error) {
        console.error('Failed to load journal entries for GL:', error)
      }
    }
    void loadJournals()
  }, [transactions.length])

  const range = useMemo(() => getPresetRange(preset), [preset])

  const ledgerLines = useMemo(
    () =>
      buildGeneralLedger(transactions, journalEntries, {
        ...range,
        accountFilter: accountFilter || null,
      }),
    [transactions, journalEntries, range, accountFilter]
  )

  const accountSummary = useMemo(
    () => summarizeGeneralLedgerByAccount(ledgerLines),
    [ledgerLines]
  )

  const accounts = useMemo(() => {
    const set = new Set<string>()
    for (const line of ledgerLines) set.add(line.account)
    return Array.from(set).sort()
  }, [ledgerLines])

  const exportCsv = () => {
    const header = ['Date', 'Source', 'Reference', 'Description', 'Account', 'Debit', 'Credit']
    const rows = ledgerLines.map((line) => [
      line.date,
      line.source,
      line.reference || '',
      line.description,
      line.accountLabel,
      line.debit.toFixed(2),
      line.credit.toFixed(2),
    ])
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `general-ledger-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="card space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <BookOpenCheck className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-2xl font-semibold">General Ledger</h2>
            <p className="text-sm text-gray-600">
              Double-entry view across bank, cash, payroll, and manual journals.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        {(['month', 'quarter', 'year', 'all'] as DatePreset[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setPreset(value)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              preset === value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {value === 'month'
              ? 'This month'
              : value === 'quarter'
                ? 'This quarter'
                : value === 'year'
                  ? 'This FY'
                  : 'All'}
          </button>
        ))}
        <select
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All accounts</option>
          {accounts.map((account) => (
            <option key={account} value={account}>
              {account}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Ledger lines</p>
          <p className="text-2xl font-semibold">{ledgerLines.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total debits</p>
          <p className="text-2xl font-semibold text-blue-700">
            {formatCurrency(ledgerLines.reduce((sum, line) => sum + line.debit, 0))}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total credits</p>
          <p className="text-2xl font-semibold text-purple-700">
            {formatCurrency(ledgerLines.reduce((sum, line) => sum + line.credit, 0))}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Source</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-left">Account</th>
              <th className="px-3 py-2 text-right">Debit</th>
              <th className="px-3 py-2 text-right">Credit</th>
            </tr>
          </thead>
          <tbody>
            {ledgerLines.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                  No ledger activity for the selected period.
                </td>
              </tr>
            ) : (
              ledgerLines.map((line: GeneralLedgerLine) => (
                <tr key={line.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 whitespace-nowrap">{formatDateAustralian(line.date)}</td>
                  <td className="px-3 py-2 capitalize">{line.source}</td>
                  <td className="px-3 py-2">{line.description}</td>
                  <td className="px-3 py-2">{line.accountLabel}</td>
                  <td className="px-3 py-2 text-right">
                    {line.debit > 0 ? formatCurrency(line.debit) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {line.credit > 0 ? formatCurrency(line.credit) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {accountSummary.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Account summary</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Account</th>
                  <th className="px-3 py-2 text-right">Debit</th>
                  <th className="px-3 py-2 text-right">Credit</th>
                  <th className="px-3 py-2 text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {accountSummary.map((row) => (
                  <tr key={row.account} className="border-t border-gray-100">
                    <td className="px-3 py-2">{row.accountLabel}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(row.totalDebit)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(row.totalCredit)}</td>
                    <td className="px-3 py-2 text-right font-medium">
                      {formatCurrency(row.netBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
