'use client'

import { formatCurrency } from '@/lib/utils/currency-format'
import type { BasLodgmentResult } from '@/lib/ato-lodgment/types'

function fieldAmount(fields: BasLodgmentResult['fields'], id: string): number {
  return fields.find((f) => f.id === id)?.amount ?? 0
}

interface BasPeriodSummaryCardProps {
  result: BasLodgmentResult
}

export function BasPeriodSummaryCard({ result }: BasPeriodSummaryCardProps) {
  const g1 = fieldAmount(result.fields, 'G1')
  const gstOnSales = fieldAmount(result.fields, '1A')
  const gstOnPurchases = fieldAmount(result.fields, '1B')
  const gstPayable = fieldAmount(result.fields, '1C')
  const gstRefund = fieldAmount(result.fields, '7C')
  const w1 = fieldAmount(result.fields, 'W1')
  const w2 = fieldAmount(result.fields, 'W2')
  const paygLabel4 = fieldAmount(result.fields, '4')

  const netGst =
    gstPayable > 0 ? gstPayable : gstRefund > 0 ? -gstRefund : gstOnSales - gstOnPurchases

  return (
    <div className="card border-emerald-100 bg-emerald-50/30 print:hidden">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        BAS period summary — {result.periodLabel}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <p className="text-gray-500 text-xs">G1 Total sales</p>
          <p className="font-mono font-semibold">{formatCurrency(g1)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">GST net (1C / 7C)</p>
          <p className="font-mono font-semibold">
            {netGst >= 0 ? formatCurrency(netGst) : `(${formatCurrency(Math.abs(netGst))}) refund`}
          </p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">W1 gross payments</p>
          <p className="font-mono font-semibold">{formatCurrency(w1)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">W2 / Label 4 withheld</p>
          <p className="font-mono font-semibold">
            {formatCurrency(w2)}
            {w2 !== paygLabel4 && paygLabel4 > 0 && (
              <span className="text-xs text-amber-700 block">Label 4: {formatCurrency(paygLabel4)}</span>
            )}
          </p>
        </div>
      </div>
      {result.uncategorisedCount > 0 && (
        <p className="text-xs text-amber-700 mt-2">
          {result.uncategorisedCount} uncategorised transaction(s) in this BAS period.
        </p>
      )}
    </div>
  )
}
