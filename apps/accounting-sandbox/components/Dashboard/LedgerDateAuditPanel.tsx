'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { auditLedgerDates } from '@/lib/storage/audit-ledger-dates'

type AuditResult = Awaited<ReturnType<typeof auditLedgerDates>>

/**
 * On-screen version of the console audit — read-only. Shows which statement holds
 * which months, so "Q4 shows 0 txs" can be traced without DevTools.
 */
export function LedgerDateAuditPanel() {
  const [result, setResult] = useState<AuditResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const run = async () => {
    setIsRunning(true)
    setError(null)
    try {
      setResult(await auditLedgerDates())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audit failed')
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-lg font-semibold">Ledger date audit</h3>
          <p className="text-sm text-gray-600">
            Read-only. Shows how many rows each saved statement holds and which months they
            fall in. Nothing is changed or deleted.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void run()}
          disabled={isRunning}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-60 text-sm font-medium flex items-center gap-2 shrink-0"
        >
          <Search className="w-4 h-4" />
          {isRunning ? 'Checking…' : 'Run audit'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-3">
          <p className="text-sm text-gray-800">
            Cash expenses: <strong>{result.cashExpenses}</strong> · Browser cache rows:{' '}
            <strong>{result.cacheRows}</strong> · Cache-only bank rows:{' '}
            <strong>{result.cacheOnlyRows.length}</strong>
          </p>
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-md">
            <p className="text-sm text-indigo-900">
              Rows the dashboard actually loads: <strong>{result.loadedTotal}</strong>
            </p>
            <p className="text-xs text-indigo-800 mt-1 break-words">
              {Object.entries(result.loadedMonths)
                .map(([month, count]) => `${month}: ${count}`)
                .join(' · ') || 'none'}
            </p>
          </div>
          {(() => {
            const folds = result.dateConflicts.filter((c) => c.monthShift3)
            const recurring = result.dateConflicts.filter((c) => !c.monthShift3)
            return (
              <>
                {folds.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <p className="text-sm font-medium text-amber-900">
                      Likely date corruption (same day-of-month, month +3) — {folds.length}
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-amber-900">
                      {folds.map((conflict) => (
                        <li key={`${conflict.description}|${conflict.amount}|fold`}>
                          <span className="font-medium">
                            ${conflict.amount} {conflict.description}
                          </span>{' '}
                          —{' '}
                          {conflict.entries
                            .map((entry) => `${entry.date} (${entry.file})`)
                            .join(' vs ')}
                          <span className="ml-1 font-semibold">← month +3 fold</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {recurring.length > 0 && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                    <p className="text-sm font-medium text-gray-800">
                      Same amount + description on different dates ({recurring.length}) — often a
                      monthly recurring payment; not a duplicate by itself
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-gray-700">
                      {recurring.map((conflict) => (
                        <li key={`${conflict.description}|${conflict.amount}|rec`}>
                          <span className="font-medium">
                            ${conflict.amount} {conflict.description}
                          </span>{' '}
                          —{' '}
                          {conflict.entries
                            .map((entry) => `${entry.date} (${entry.file})`)
                            .join(' · ')}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )
          })()}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">File</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Rows</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">First</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Last</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Rows per month
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {result.statements.map((stmt) => (
                  <tr key={stmt.file}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">{stmt.file}</div>
                      {stmt.bank && <div className="text-xs text-gray-500">{stmt.bank}</div>}
                    </td>
                    <td className="px-3 py-2 text-gray-900">{stmt.rows}</td>
                    <td className="px-3 py-2 text-gray-700">{stmt.first}</td>
                    <td className="px-3 py-2 text-gray-700">{stmt.last}</td>
                    <td className="px-3 py-2 text-gray-700">
                      {Object.entries(stmt.months)
                        .map(([month, count]) => `${month}: ${count}`)
                        .join(' · ') || '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {Object.entries(stmt.sources)
                        .map(([source, count]) => `${source}: ${count}`)
                        .join(' · ') || '—'}
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
