'use client'

import { formatCurrency } from '@/lib/utils/currency-format'
import { atoCentsLeftOut } from '@/lib/utils/ato-lodgment-rounding'
import type { CtrLodgmentResult } from '@/lib/ato-lodgment/types'

const ITEM6_IDS = [
  'CTR_6R_OTHER_GROSS_INCOME',
  'CTR_6S_TOTAL_INCOME',
  'CTR_6C_CONTRACTOR',
  'CTR_6Y_MOTOR',
  'CTR_6Z_REPAIRS',
  'CTR_6S_OTHER_EXPENSES',
  'CTR_6Q_TOTAL_EXPENSES',
  'CTR_6T_PROFIT_LOSS',
] as const

function ledgerForField(
  id: string,
  ledger: NonNullable<CtrLodgmentResult['item6LedgerCents']>
): number | null {
  switch (id) {
    case 'CTR_6S_TOTAL_INCOME':
      return ledger.totalIncome
    case 'CTR_6Q_TOTAL_EXPENSES':
      return ledger.totalExpenses
    case 'CTR_6T_PROFIT_LOSS':
      return Math.abs(ledger.profitOrLoss)
    case 'CTR_6Y_MOTOR':
      return ledger.motor
    default:
      return null
  }
}

function formatAtoWholeDollars(amount: number): string {
  return `$${Math.trunc(amount).toLocaleString('en-US')}`
}

interface CtrItem6FormPanelProps {
  result: CtrLodgmentResult
}

/**
 * ATO Company tax return 2026 — Item 6 worksheet layout (preparation only).
 * Matches official label IDs; amounts are ATO whole $ (leave cents out).
 */
export function CtrItem6FormPanel({ result }: CtrItem6FormPanelProps) {
  const ledger = result.item6LedgerCents
  const item6 = result.fields.filter((f) =>
    ITEM6_IDS.includes(f.id as (typeof ITEM6_IDS)[number])
  )

  if (item6.length === 0) return null

  const isLoss = item6.some((f) => f.id === 'CTR_6T_PROFIT_LOSS' && f.label.includes('(L)'))

  return (
    <div className="card border-slate-300 bg-white print:border print:shadow-none">
      <div className="border-b border-slate-200 px-4 py-3 bg-slate-50">
        <h3 className="text-sm font-semibold text-gray-900">
          Company tax return 2026 — Item 6
        </h3>
        <p className="text-xs text-gray-600 mt-0.5">
          Calculation of total profit or loss · FY {result.financialYear} · excl. GST (per-line)
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
            {item6.map((field) => {
              const ledgerAmt = ledger ? ledgerForField(field.id, ledger) : null
              const leftOut =
                ledgerAmt != null ? atoCentsLeftOut(ledgerAmt) : atoCentsLeftOut(field.amount)
              return (
                <tr key={field.id} className="border-b border-gray-50">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-gray-900">{field.label}</div>
                    {field.description && (
                      <div className="text-xs text-gray-500 mt-0.5">{field.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-gray-600">
                    {ledgerAmt != null ? formatCurrency(ledgerAmt) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-gray-900">
                    {formatAtoWholeDollars(field.amount)}
                    {field.id === 'CTR_6T_PROFIT_LOSS' && isLoss && (
                      <span className="ml-1 text-amber-800 font-sans text-xs">L</span>
                    )}
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

      <p className="px-4 py-2 text-[11px] text-gray-500 border-t border-gray-100">
        Copy <strong>ATO lodge $</strong> into OSB. Ledger keeps cents; ATO labels leave cents out
        (do not round up). Biz Intel cash P&amp;L stays GST-inclusive.
      </p>
    </div>
  )
}
