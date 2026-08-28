'use client'

import { formatCurrency } from '@/lib/utils/currency-format'

interface CtrAnnualCrossHintProps {
  financialYear: string
  annualIncomeExGst: number
  annualExpensesExGst: number
  annualNetExGst: number
  ctrIncomeExGst: number
  ctrExpensesExGst: number
  ctrProfitOrLoss: number
}

function deltaLine(label: string, annual: number, ctr: number): string | null {
  const d = Math.round((annual - ctr) * 100) / 100
  if (Math.abs(d) <= 0.03) return null
  return `${label}: Annual ${formatCurrency(annual)} vs CTR ${formatCurrency(ctr)} (Δ ${formatCurrency(d)})`
}

/**
 * Company CTR Item 6 should align with Annual L2 (per-line ex-GST) for the same FY.
 */
export function CtrAnnualCrossHint({
  financialYear,
  annualIncomeExGst,
  annualExpensesExGst,
  annualNetExGst,
  ctrIncomeExGst,
  ctrExpensesExGst,
  ctrProfitOrLoss,
}: CtrAnnualCrossHintProps) {
  const incomeDelta = deltaLine('Income', annualIncomeExGst, ctrIncomeExGst)
  const expenseDelta = deltaLine('Expenses', annualExpensesExGst, ctrExpensesExGst)
  const netDelta = deltaLine('Net', annualNetExGst, ctrProfitOrLoss)
  const aligned = !incomeDelta && !expenseDelta && !netDelta

  return (
    <div className="card border-indigo-200 bg-indigo-50/60 print:hidden">
      <h3 className="text-sm font-semibold text-indigo-950 mb-1">
        CTR Item 6 ↔ Annual income (L2 ex-GST) — FY {financialYear}
      </h3>
      <p className="text-xs text-indigo-900 mb-2">
        Both tabs use per-line <strong>L2</strong> (excl. GST). Biz Intel cash P&amp;L stays{' '}
        <strong>L1</strong> (incl. GST). BAS / lodge columns use <strong>L3</strong> whole $.
      </p>
      {aligned ? (
        <p className="text-xs text-green-800 font-medium">
          Item 6 totals match Annual myTax L2 for this FY (within cents).
        </p>
      ) : (
        <ul className="text-xs text-amber-900 space-y-0.5 list-disc list-inside">
          {incomeDelta && <li>{incomeDelta}</li>}
          {expenseDelta && <li>{expenseDelta}</li>}
          {netDelta && <li>{netDelta}</li>}
          <li className="list-none mt-1 text-indigo-800">
            Small gaps may be CTR adjustments (add-backs, losses) — not Biz Intel L1 cash.
          </li>
        </ul>
      )}
    </div>
  )
}
