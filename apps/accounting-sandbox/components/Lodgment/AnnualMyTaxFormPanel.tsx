'use client'

import { formatCurrency } from '@/lib/utils/currency-format'
import {
  atoCentsLeftOut,
  roundAtoWholeDollars,
} from '@/lib/utils/ato-lodgment-rounding'
import type { AnnualLodgmentResult } from '@/lib/ato-lodgment/types'
import type { LodgmentField } from '@/lib/ato-lodgment/types'

const CORE_FIELD_IDS = [
  'MYTAX_GROSS_PAYMENTS',
  'MYTAX_OTHER_INCOME',
  'MYTAX_TOTAL_INCOME',
  'MYTAX_CONTRACTOR',
  'MYTAX_MOTOR_VEHICLE',
  'MYTAX_PURCHASES',
  'MYTAX_OTHER_EXPENSES',
  'MYTAX_TOTAL_EXPENSES',
  'MYTAX_NET_INCOME',
] as const

const GST_INFO_IDS = ['MYTAX_GST_ON_INCOME', 'MYTAX_GST_ON_PURCHASES'] as const

function ledgerForField(
  id: string,
  ledger: NonNullable<AnnualLodgmentResult['annualLedgerCents']>
): number | null {
  switch (id) {
    case 'MYTAX_GROSS_PAYMENTS':
      return ledger.grossPayments
    case 'MYTAX_OTHER_INCOME':
      return ledger.otherIncome
    case 'MYTAX_TOTAL_INCOME':
      return ledger.totalIncome
    case 'MYTAX_CONTRACTOR':
      return ledger.contractor
    case 'MYTAX_MOTOR_VEHICLE':
      return ledger.motor
    case 'MYTAX_PURCHASES':
      return ledger.purchases
    case 'MYTAX_OTHER_EXPENSES':
      return ledger.otherExpenses
    case 'MYTAX_TOTAL_EXPENSES':
      return ledger.totalExpenses
    case 'MYTAX_NET_INCOME':
      return ledger.netIncome
    case 'MYTAX_GST_ON_INCOME':
      return ledger.gstOnIncome
    case 'MYTAX_GST_ON_PURCHASES':
      return ledger.gstOnPurchases
    default:
      return null
  }
}

function formatAtoWholeDollars(amount: number): string {
  return `$${Math.abs(Math.trunc(amount)).toLocaleString('en-US')}`
}

function fieldById(
  fields: LodgmentField[],
  id: string
): LodgmentField | undefined {
  return fields.find((f) => f.id === id)
}

interface AnnualMyTaxFormPanelProps {
  result: AnnualLodgmentResult
  /** Company uses CTR — panel still shows ex-GST worksheet for review. */
  accountType?: 'company' | 'sole_trader' | 'individual'
}

/**
 * ATO Annual / myTax business income worksheet (ex GST).
 * Mirrors BAS/CTR panels: ledger cents | ATO lodge $ | cents left out.
 */
export function AnnualMyTaxFormPanel({
  result,
  accountType,
}: AnnualMyTaxFormPanelProps) {
  const ledger = result.annualLedgerCents
  const coreFields = CORE_FIELD_IDS.map((id) => fieldById(result.fields, id)).filter(
    (f): f is LodgmentField => !!f
  )
  const gstInfoFields = GST_INFO_IDS.map((id) => fieldById(result.fields, id)).filter(
    (f): f is LodgmentField => !!f
  )

  if (coreFields.length === 0) return null

  const netField = fieldById(result.fields, 'MYTAX_NET_INCOME')
  const isLoss = (ledger?.netIncome ?? netField?.amount ?? 0) < -0.005

  const renderRow = (
    field: LodgmentField,
    options?: { informational?: boolean }
  ) => {
    const ledgerAmt = ledger ? ledgerForField(field.id, ledger) : field.amount
    const lodge = roundAtoWholeDollars(ledgerAmt ?? field.amount)
    const leftOut = atoCentsLeftOut(ledgerAmt ?? field.amount)
    const showLoss =
      field.id === 'MYTAX_NET_INCOME' && isLoss && lodge !== 0

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
          {options?.informational ? (
            <span className="text-gray-500 font-normal text-xs">BAS 1A/1B</span>
          ) : (
            <>
              {formatAtoWholeDollars(ledgerAmt ?? field.amount)}
              {showLoss && (
                <span className="ml-1 text-amber-800 font-sans text-xs">L</span>
              )}
            </>
          )}
        </td>
        <td className="px-4 py-2.5 text-right font-mono text-xs text-gray-500">
          {!options?.informational && leftOut > 0.005
            ? formatCurrency(leftOut)
            : '—'}
        </td>
      </tr>
    )
  }

  return (
    <div className="card border-indigo-200 bg-white print:border print:shadow-none">
      <div className="border-b border-indigo-100 px-4 py-3 bg-indigo-50/50">
        <h3 className="text-sm font-semibold text-gray-900">
          {accountType === 'company'
            ? 'Annual business income — tax basis (ex GST)'
            : 'myTax — Business or professional items (excluding GST)'}
        </h3>
        <p className="text-xs text-gray-600 mt-0.5">
          FY {result.financialYear} · {result.periodStart} → {result.periodEnd}
          {accountType === 'company'
            ? ' · Lodge company amounts on the CTR tab'
            : ''}
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
            {coreFields.map((field) => renderRow(field))}
          </tbody>
        </table>
      </div>

      {gstInfoFields.length > 0 && (
        <div className="border-t border-gray-100">
          <p className="px-4 pt-2 text-[11px] font-medium text-gray-600">
            GST cross-check (informational — sum BAS quarters for the year)
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {gstInfoFields.map((field) => renderRow(field, { informational: true }))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result.uncategorisedCount > 0 && (
        <p className="px-4 py-2 text-xs text-amber-700 border-t border-gray-100">
          {result.uncategorisedCount} uncategorised transaction(s) in this financial year.
        </p>
      )}

      <p className="px-4 py-2 text-[11px] text-gray-500 border-t border-gray-100">
        Amounts are <strong>excluding GST</strong> (per-line L2). Copy <strong>ATO lodge $</strong>{' '}
        into myTax or use the CTR tab for companies. Biz Intel cash P&amp;L stays GST-inclusive.
      </p>
    </div>
  )
}
