'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils/currency-format'
import { formatDateAustralian } from '@/lib/utils/date-format'
import {
  ANNUAL_COMPARE_METRIC_IDS,
  annualCompareDriftFields,
  annualCompareMetricLabel,
  annualCompareTotalAbsDelta,
  type AnnualSnapshotCompareRow,
} from '@/lib/ato-lodgment/annual-snapshot-compare'
import type { LodgmentSnapshot } from '@/lib/storage/lodgment-snapshot-types'

interface AnnualSnapshotComparePanelProps {
  row: AnnualSnapshotCompareRow
  onLoadSnapshot?: (snapshot: LodgmentSnapshot) => void
  onUpdateSnapshot?: () => void | Promise<void>
  updateBusy?: boolean
}

function formatSigned(n: number): string {
  const abs = formatCurrency(Math.abs(n))
  if (n > 0.005) return `+${abs}`
  if (n < -0.005) return `−${abs}`
  return formatCurrency(0)
}

export function AnnualSnapshotComparePanel({
  row,
  onLoadSnapshot,
  onUpdateSnapshot,
  updateBusy = false,
}: AnnualSnapshotComparePanelProps) {
  const [expanded, setExpanded] = useState(false)
  const totalDelta = annualCompareTotalAbsDelta(row)
  const driftFields = annualCompareDriftFields(row)
  const hasDrift = row.hasSnapshot && totalDelta > 0.03

  return (
    <div className="card border-violet-100 bg-violet-50/30 print:hidden">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900">
          Annual snapshot comparison — {row.periodLabel}
        </h3>
        <p className="text-xs text-gray-600 mt-0.5">
          Live L2 ledger vs last saved annual snapshot · BAS quarters use the panel on the BAS tab
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-gray-500 border-b border-violet-100">
              <th className="py-2 pr-3 font-medium">Status</th>
              {ANNUAL_COMPARE_METRIC_IDS.map((id) => (
                <th key={id} className="py-2 px-2 font-medium text-right whitespace-nowrap">
                  {annualCompareMetricLabel(id)}
                </th>
              ))}
              <th className="py-2 pl-2 font-medium">Δ vs snapshot</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-violet-50 bg-violet-100/40">
              <td className="py-2 pr-3">
                {row.snapshot ? (
                  <button
                    type="button"
                    onClick={() => row.snapshot && onLoadSnapshot?.(row.snapshot)}
                    className="text-left hover:text-indigo-700"
                  >
                    <span
                      className={row.snapshotFinalized ? 'text-green-700' : 'text-gray-700'}
                    >
                      {row.snapshotFinalized ? 'Finalized' : 'Saved'}
                    </span>
                    <span className="block text-[10px] text-gray-500">
                      {formatDateAustralian(row.snapshot.updatedAt.slice(0, 10))}
                    </span>
                  </button>
                ) : (
                  <span className="text-amber-700">No snapshot</span>
                )}
              </td>
              {ANNUAL_COMPARE_METRIC_IDS.map((id) => {
                const m = row.metrics[id]
                const cellDrift = row.hasSnapshot && Math.abs(m.delta) > 0.03
                return (
                  <td
                    key={id}
                    className={`py-2 px-2 text-right font-mono whitespace-nowrap ${
                      cellDrift ? 'text-amber-800' : ''
                    }`}
                  >
                    {formatCurrency(m.live)}
                  </td>
                )
              })}
              <td className="py-2 pl-2">
                {row.hasSnapshot ? (
                  hasDrift ? (
                    <div className="flex flex-col gap-1 items-start">
                      <button
                        type="button"
                        onClick={() => setExpanded((v) => !v)}
                        className="text-amber-700 font-medium hover:underline text-left"
                      >
                        Drift {formatCurrency(totalDelta)}
                        <span className="ml-1 text-[10px] font-normal text-amber-600">
                          {expanded ? '▾' : '▸'} details
                        </span>
                      </button>
                      {onUpdateSnapshot && (
                        <button
                          type="button"
                          disabled={updateBusy || row.snapshotFinalized}
                          onClick={() => void onUpdateSnapshot()}
                          className="text-[10px] px-2 py-0.5 rounded border border-violet-300 bg-white text-violet-800 hover:bg-violet-50 disabled:opacity-50"
                        >
                          {updateBusy ? 'Updating…' : 'Update snapshot'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-green-700">In sync</span>
                  )
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
            </tr>
            {expanded && hasDrift && (
              <tr className="bg-amber-50/80 border-b border-amber-100">
                <td colSpan={ANNUAL_COMPARE_METRIC_IDS.length + 2} className="px-3 py-2">
                  <ul className="grid grid-cols-1 sm:grid-cols-3 gap-1">
                    {driftFields.map((f) => (
                      <li
                        key={f.id}
                        className="text-[11px] text-gray-800 font-mono flex flex-wrap gap-x-2"
                      >
                        <span className="font-sans font-semibold text-gray-700">
                          {annualCompareMetricLabel(f.id)}
                        </span>
                        <span>
                          {formatCurrency(f.snapshot)} → {formatCurrency(f.live)}
                        </span>
                        <span className="text-amber-800">{formatSigned(f.delta)}</span>
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-gray-500 mt-2">
        Amounts are L2 (excl. GST). Save a snapshot after review; use Update snapshot when ledger
        tags change.
      </p>
    </div>
  )
}
