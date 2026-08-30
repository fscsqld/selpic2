'use client'

import { formatCurrency } from '@/lib/utils/currency-format'
import { atoCentsLeftOut } from '@/lib/utils/ato-lodgment-rounding'
import type { BasLodgmentResult } from '@/lib/ato-lodgment/types'

function fieldAmount(fields: BasLodgmentResult['fields'], id: string): number {
  return fields.find((f) => f.id === id)?.amount ?? 0
}

function formatAtoWholeDollars(amount: number): string {
  return `$${Math.trunc(amount).toLocaleString('en-US')}`
}

interface BasGstFormPanelProps {
  result: BasLodgmentResult
}

type BasRow = {
  id: string
  label: string
  description?: string
  lodge: number
  ledger: number | null
}

/**
 * ATO Activity Statement — Simpler BAS GST block (G1, 1A, 1B, 9).
 * Mirrors accountant PDF layout; preparation only (no SBR lodge).
 */
export function BasGstFormPanel({ result }: BasGstFormPanelProps) {
  const ledger = result.basLedgerCents
  const g1 = fieldAmount(result.fields, 'G1')
  const a1 = fieldAmount(result.fields, '1A')
  const b1 = fieldAmount(result.fields, '1B')
  const c1 = fieldAmount(result.fields, '1C')
  const refund7c = fieldAmount(result.fields, '7C')
  const payment9 = c1 > 0 ? c1 : refund7c
  const isRefund = refund7c > 0 && c1 === 0
  const exGst =
    ledger?.g1 != null && ledger?.gstOnSales != null
      ? ledger.g1 - ledger.gstOnSales
      : null

  const rows: BasRow[] = [
    {
      id: 'G1',
      label: 'G1 — Total sales',
      description: 'GST inclusive (cash accounting).',
      lodge: g1,
      ledger: ledger?.g1 ?? null,
    },
    {
      id: '1A',
      label: '1A — GST on sales',
      lodge: a1,
      ledger: ledger?.gstOnSales ?? null,
    },
    {
      id: '1B',
      label: '1B — GST on purchases',
      lodge: b1,
      ledger: ledger?.gstOnPurchases ?? null,
    },
    {
      id: '9',
      label: isRefund ? '9 — GST refund (1B − 1A)' : '9 — GST payable (1A − 1B)',
      description: 'Payment or refund — whole dollars on the lodged BAS.',
      lodge: payment9,
      ledger: ledger ? Math.abs(ledger.gstNet) : null,
    },
  ]

  return (
    <div className="card border-emerald-200 bg-white print:border print:shadow-none">
      <div className="border-b border-emerald-100 px-4 py-3 bg-emerald-50/50">
        <h3 className="text-sm font-semibold text-gray-900">
          Activity Statement — Goods and services tax (GST)
        </h3>
        <p className="text-xs text-gray-600 mt-0.5">
          Simpler BAS · {result.periodLabel} · {result.periodStart} → {result.periodEnd}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
              <th className="px-4 py-2 font-medium">ATO label</th>
              <th className="px-4 py-2 font-medium text-right">Ledger (cents)</th>
              <th className="px-4 py-2 font-medium text-right">ATO lodge $</th>
              <th className="px-4 py-2 font-medium text-right">Cents left out</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const leftOut =
                row.ledger != null
                  ? atoCentsLeftOut(row.ledger)
                  : atoCentsLeftOut(row.lodge)
              return (
                <tr key={row.id} className="border-b border-gray-50">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-gray-900">{row.label}</div>
                    {row.description && (
                      <div className="text-xs text-gray-500 mt-0.5">{row.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-gray-600">
                    {row.ledger != null ? formatCurrency(row.ledger) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-gray-900">
                    {formatAtoWholeDollars(row.lodge)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-gray-500">
                    {leftOut > 0.005 ? formatCurrency(leftOut) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {exGst != null && (
        <div className="px-4 py-2.5 text-xs text-emerald-900 bg-emerald-50/90 border-t border-emerald-100">
          <span className="font-medium">This period (L2):</span> G1 − 1A ={' '}
          <span className="font-mono">{formatCurrency(exGst)}</span> ex-GST sales.{' '}
          <span className="text-emerald-800">
            1A is GST only — not income. Annual <em>Gross payments</em> is FY ex-GST; G1 is
            GST-inclusive.
          </span>
        </div>
      )}

      {result.uncategorisedCount > 0 && (
        <p className="px-4 py-2 text-xs text-amber-700 border-t border-gray-100">
          {result.uncategorisedCount} uncategorised transaction(s) in this BAS period.
        </p>
      )}

      <p className="px-4 py-2 text-[11px] text-gray-500 border-t border-gray-100">
        G1 is GST-<strong>inclusive</strong> cash sales. 1A/1B are GST cents from the ledger;
        lodge <strong>whole dollars</strong> (leave cents out). Bank ATO refunds match lodge $,
        not ledger cents.
      </p>
    </div>
  )
}
