'use client'

import { Fragment, useState } from 'react'
import { formatCurrency } from '@/lib/utils/currency-format'
import { formatDateAustralian } from '@/lib/utils/date-format'
import {
  BAS_COMPARE_METRIC_IDS,
  basCompareDriftFields,
  basCompareTotalAbsDelta,
  type BasPeriodCompareRow,
} from '@/lib/ato-lodgment/bas-snapshot-compare'
import type { LodgmentSnapshot } from '@/lib/storage/lodgment-snapshot-types'

const METRIC_LABELS: Record<string, string> = {
  G1: 'G1 Sales',
  '1A': '1A GST sales',
  '1B': '1B GST purchases',
  '1C': '1C GST payable',
  '7C': '7C GST refund',
  W1: 'W1 Gross pay',
  W2: 'W2 Withheld',
  '4': 'Label 4',
}

interface BasSnapshotComparePanelProps {
  financialYear: string
  rows: BasPeriodCompareRow[]
  currentPeriodKey: string | null
  onLoadSnapshot?: (snapshot: LodgmentSnapshot) => void
  /** Re-save live ledger fields over the current period’s snapshot (clears drift). */
  onUpdateCurrentSnapshot?: () => void | Promise<void>
  updateBusy?: boolean
}

function formatSigned(n: number): string {
  const abs = formatCurrency(Math.abs(n))
  if (n > 0.005) return `+${abs}`
  if (n < -0.005) return `−${abs}`
  return formatCurrency(0)
}

export function BasSnapshotComparePanel({
  financialYear,
  rows,
  currentPeriodKey,
  onLoadSnapshot,
  onUpdateCurrentSnapshot,
  updateBusy = false,
}: BasSnapshotComparePanelProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  if (rows.length === 0) return null

  const withSnapshot = rows.filter((r) => r.hasSnapshot).length
  const finalized = rows.filter((r) => r.snapshotFinalized).length

  return (
    <div className="card border-teal-100 bg-teal-50/30 print:hidden">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            BAS snapshot comparison — FY {financialYear}
          </h3>
          <p className="text-xs text-gray-600 mt-0.5">
            {withSnapshot} of {rows.length} period(s) saved · {finalized} finalized
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-gray-500 border-b border-teal-100">
              <th className="py-2 pr-3 font-medium">Period</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              {BAS_COMPARE_METRIC_IDS.map((id) => (
                <th key={id} className="py-2 px-2 font-medium text-right whitespace-nowrap">
                  {METRIC_LABELS[id] ?? id}
                </th>
              ))}
              <th className="py-2 pl-2 font-medium">Δ vs snapshot</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isCurrent = row.periodKey === currentPeriodKey
              const totalDelta = basCompareTotalAbsDelta(row)
              const driftFields = basCompareDriftFields(row)
              const hasDrift = row.hasSnapshot && totalDelta > 0.03
              const expanded = expandedKey === row.periodKey

              return (
                <Fragment key={row.periodKey}>
                  <tr
                    className={`border-b border-teal-50 ${
                      isCurrent ? 'bg-teal-100/50' : ''
                    }`}
                  >
                    <td className="py-2 pr-3">
                      <span className="font-medium text-gray-900">{row.periodLabel}</span>
                      {isCurrent && (
                        <span className="ml-1 text-teal-700 text-[10px] uppercase">current</span>
                      )}
                    </td>
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
                    {BAS_COMPARE_METRIC_IDS.map((id) => {
                      const m = row.metrics[id]
                      const cellDrift = row.hasSnapshot && Math.abs(m.delta) > 0.03
                      return (
                        <td
                          key={id}
                          className={`py-2 px-2 text-right font-mono whitespace-nowrap ${
                            cellDrift ? 'text-amber-800' : ''
                          }`}
                          title={
                            cellDrift
                              ? `Live ${formatCurrency(m.live)} · Saved ${formatCurrency(m.snapshot)} · Δ ${formatSigned(m.delta)}`
                              : undefined
                          }
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
                              onClick={() =>
                                setExpandedKey(expanded ? null : row.periodKey)
                              }
                              className="text-amber-700 font-medium hover:underline text-left"
                            >
                              Drift {formatCurrency(totalDelta)}
                              <span className="ml-1 text-[10px] font-normal text-amber-600">
                                {expanded ? '▾' : '▸'} details
                              </span>
                            </button>
                            {isCurrent && onUpdateCurrentSnapshot && (
                              <button
                                type="button"
                                disabled={updateBusy || row.snapshotFinalized}
                                onClick={() => void onUpdateCurrentSnapshot()}
                                className="text-[10px] px-2 py-0.5 rounded border border-teal-300 bg-white text-teal-800 hover:bg-teal-50 disabled:opacity-50"
                                title={
                                  row.snapshotFinalized
                                    ? 'Finalized snapshots cannot be overwritten here'
                                    : 'Overwrite saved snapshot with live ledger amounts'
                                }
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
                      <td colSpan={2 + BAS_COMPARE_METRIC_IDS.length + 1} className="px-3 py-2">
                        <p className="text-[10px] font-medium text-amber-900 mb-1">
                          Field drift (live − saved)
                        </p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1">
                          {driftFields.map((f) => (
                            <li
                              key={f.id}
                              className="text-[11px] text-gray-800 font-mono flex flex-wrap gap-x-2"
                            >
                              <span className="font-sans font-semibold text-gray-700">
                                {METRIC_LABELS[f.id] ?? f.id}
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
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-gray-500 mt-2">
        Live ledger amounts shown. Expand Drift for field-level Δ; use Update snapshot on the
        current period to re-save after calculation fixes. Finalized snapshots stay locked.
      </p>
    </div>
  )
}
