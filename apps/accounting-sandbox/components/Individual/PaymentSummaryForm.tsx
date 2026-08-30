'use client'

import { useCallback, useEffect, useState } from 'react'
import { FileText, Loader2, Plus, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency-format'
import { getCurrentFinancialYearRange } from '@/lib/ato-lodgment/compute-lodgment'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import type { PaymentSummaryEntry } from '@/lib/storage/payment-summary-types'

export const PAYMENT_SUMMARY_UPDATED_EVENT = 'paymentSummaryUpdated'

interface PaymentSummaryFormProps {
  financialYear?: string
  compact?: boolean
}

function listRecentFinancialYears(count: number = 5): string[] {
  const current = getCurrentFinancialYearRange().financialYear
  const [startYear] = current.split('-').map(Number)
  const years: string[] = []
  for (let i = 0; i < count; i++) {
    const sy = startYear - i
    years.push(`${sy}-${sy + 1}`)
  }
  return years
}

function formatAbnInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`
  if (digits.length <= 8) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`
}

export function PaymentSummaryForm({
  financialYear: financialYearProp,
  compact = false,
}: PaymentSummaryFormProps) {
  const [financialYear, setFinancialYear] = useState(
    () => financialYearProp || getCurrentFinancialYearRange().financialYear
  )
  const [entries, setEntries] = useState<PaymentSummaryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [employerName, setEmployerName] = useState('')
  const [payerAbn, setPayerAbn] = useState('')
  const [grossPayments, setGrossPayments] = useState('')
  const [taxWithheld, setTaxWithheld] = useState('')

  const loadEntries = useCallback(async () => {
    setLoading(true)
    try {
      await indexedDBStorage.init()
      const rows = await indexedDBStorage.getPaymentSummaries(financialYear)
      setEntries(rows)
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [financialYear])

  useEffect(() => {
    if (financialYearProp) setFinancialYear(financialYearProp)
  }, [financialYearProp])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  const notifyUpdated = () => {
    window.dispatchEvent(new CustomEvent(PAYMENT_SUMMARY_UPDATED_EVENT))
  }

  const handleAdd = async () => {
    if (!employerName.trim()) {
      setError('Employer name is required')
      return
    }
    const gross = Number(grossPayments)
    const withheld = Number(taxWithheld)
    if (!Number.isFinite(gross) || gross < 0) {
      setError('Enter a valid gross payments amount')
      return
    }
    if (!Number.isFinite(withheld) || withheld < 0) {
      setError('Enter a valid tax withheld amount')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await indexedDBStorage.savePaymentSummary({
        financialYear,
        employerName: employerName.trim(),
        payerAbn: payerAbn.replace(/\D/g, '') || undefined,
        grossPayments: gross,
        taxWithheld: withheld,
      })
      setEmployerName('')
      setPayerAbn('')
      setGrossPayments('')
      setTaxWithheld('')
      await loadEntries()
      notifyUpdated()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save payment summary')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this payment summary entry?')) return
    await indexedDBStorage.deletePaymentSummary(id)
    await loadEntries()
    notifyUpdated()
  }

  const totals = entries.reduce(
    (acc, e) => ({
      gross: acc.gross + e.grossPayments,
      withheld: acc.withheld + e.taxWithheld,
    }),
    { gross: 0, withheld: 0 }
  )

  return (
    <div
      id="payment-summary-section"
      className={`card ${compact ? 'border-indigo-100' : 'border-2 border-indigo-200'}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">Payment Summaries</h3>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Enter amounts from your employer income statement / PAYG payment summary. These are
            used as the authoritative salary and tax withheld figures for myTax.
          </p>
        </div>
        {!financialYearProp && (
          <select
            value={financialYear}
            onChange={(e) => setFinancialYear(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            {listRecentFinancialYears(6).map((fy) => (
              <option key={fy} value={fy}>
                FY {fy}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <label className="text-sm text-gray-700">
          Employer name *
          <input
            type="text"
            value={employerName}
            onChange={(e) => setEmployerName(e.target.value)}
            placeholder="e.g., ACME Pty Ltd"
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm text-gray-700">
          Payer ABN (optional)
          <input
            type="text"
            value={payerAbn}
            onChange={(e) => setPayerAbn(formatAbnInput(e.target.value))}
            placeholder="XX XXX XXX XXX"
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono"
          />
        </label>
        <label className="text-sm text-gray-700">
          Gross payments ($) *
          <input
            type="number"
            min={0}
            step={0.01}
            value={grossPayments}
            onChange={(e) => setGrossPayments(e.target.value)}
            placeholder="0.00"
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm text-gray-700">
          Tax withheld ($) *
          <input
            type="number"
            min={0}
            step={0.01}
            value={taxWithheld}
            onChange={(e) => setTaxWithheld(e.target.value)}
            placeholder="0.00"
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={saving}
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        Add payment summary
      </button>

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-gray-500">
            No payment summaries for FY {financialYear} yet. Add your employer income statement
            above.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-600">
                    <th className="px-3 py-2">Employer</th>
                    <th className="px-3 py-2 text-right">Gross</th>
                    <th className="px-3 py-2 text-right">Withheld</th>
                    <th className="px-3 py-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-t border-gray-100">
                      <td className="px-3 py-2">
                        <span className="font-medium">{entry.employerName}</span>
                        {entry.payerAbn && (
                          <span className="block text-xs text-gray-500">
                            ABN {entry.payerAbn.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4')}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {formatCurrency(entry.grossPayments)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {formatCurrency(entry.taxWithheld)}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => handleDelete(entry.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <span>
                Total gross: <strong>{formatCurrency(totals.gross)}</strong>
              </span>
              <span>
                Total withheld: <strong>{formatCurrency(totals.withheld)}</strong>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
