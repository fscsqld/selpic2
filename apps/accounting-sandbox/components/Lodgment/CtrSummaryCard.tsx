'use client'

import { formatCurrency } from '@/lib/utils/currency-format'
import type { CtrLodgmentResult } from '@/lib/ato-lodgment/types'

function fieldAmount(fields: CtrLodgmentResult['fields'], id: string): number {
  return fields.find((f) => f.id === id)?.amount ?? 0
}

interface CtrSummaryCardProps {
  result: CtrLodgmentResult
  taxRate: number
}

export function CtrSummaryCard({ result, taxRate }: CtrSummaryCardProps) {
  const profitField = result.fields.find((f) => f.id === 'CTR_6T_PROFIT_LOSS')
  const isLoss = profitField?.label.includes('(L)') ?? false
  const profit = profitField?.amount ?? 0
  const profitDisplay = isLoss ? -profit : profit
  const taxable = fieldAmount(result.fields, 'CTR_TAXABLE')
  const estimatedTax = fieldAmount(result.fields, 'CTR_TAX_EST')
  const paygWithheld = fieldAmount(result.fields, 'CTR_PAYG_WITHHELD')
  const taxPayable = fieldAmount(result.fields, 'CTR_TAX_PAYABLE')

  return (
    <div className="card border-slate-200 bg-slate-50/50 print:hidden">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        CTR summary — FY {result.financialYear}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
        <div>
          <p className="text-gray-500 text-xs">Accounting profit (ex GST)</p>
          <p className="font-mono font-semibold">{formatCurrency(profitDisplay)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Taxable income</p>
          <p className="font-mono font-semibold">{formatCurrency(taxable)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Tax @ {(taxRate * 100).toFixed(0)}%</p>
          <p className="font-mono font-semibold">{formatCurrency(estimatedTax)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">PAYG withheld (FY)</p>
          <p className="font-mono font-semibold">{formatCurrency(paygWithheld)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Est. payable</p>
          <p className="font-mono font-semibold text-indigo-700">{formatCurrency(taxPayable)}</p>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Tax basis (excluding GST, est.). Confirm rate eligibility, losses and adjustments with your
        tax adviser before lodging in OSB. Cash (GST-incl.) Biz Intel net will differ when 1A ≠ 1B.
      </p>
    </div>
  )
}
