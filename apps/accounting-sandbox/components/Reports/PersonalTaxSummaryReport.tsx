'use client'

import { useMemo, useState } from 'react'
import { Download, ExternalLink, FileText, Link2, Shield } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency-format'
import { formatDateAustralian } from '@/lib/utils/date-format'
import { getCurrentFinancialYearRange } from '@/lib/ato-lodgment/compute-lodgment'
import { listRecentIndividualFinancialYears } from '@/lib/ato-lodgment/individual-lodgment-input'
import { exportPersonalTaxPack } from '@/lib/export/personal-tax-export'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import {
  computeNetCapitalGain,
  computeNetRentalIncome,
} from '@/lib/storage/tax-worksheet-types'
import { useIndividualLodgmentData } from '@/hooks/useIndividualLodgmentData'
import { MyTaxOutsideAppChecklist } from '@/components/Individual/MyTaxOutsideAppChecklist'

interface Transaction {
  date: string
  description: string
  debit: number | null
  credit: number | null
  category?: string
}

interface PersonalTaxSummaryReportProps {
  transactions: Transaction[]
  taxpayerName?: string
  onOpenAtoLodgment?: () => void
}

export function PersonalTaxSummaryReport({
  transactions,
  taxpayerName = 'Individual',
  onOpenAtoLodgment,
}: PersonalTaxSummaryReportProps) {
  const [financialYear, setFinancialYear] = useState(
    () => getCurrentFinancialYearRange().financialYear
  )

  const { loading, paymentTotals, worksheetNets, fyTransactions, lodgment } =
    useIndividualLodgmentData(transactions, financialYear)

  const incomeFields = lodgment.fields.filter((f) => f.section === 'income' || f.section === 'summary')
  const deductionFields = lodgment.fields.filter((f) => f.section === 'expense')
  const taxFields = lodgment.fields.filter((f) => f.section === 'tax')

  const taxableIncome =
    lodgment.fields.find((f) => f.id === 'IND_TAXABLE_INCOME')?.amount ?? 0

  const handleExport = async () => {
    await indexedDBStorage.init()
    const [paymentSummaries, worksheet] = await Promise.all([
      indexedDBStorage.getPaymentSummaries(financialYear),
      indexedDBStorage.getTaxWorksheet(financialYear),
    ])
    exportPersonalTaxPack({
      financialYear,
      taxpayerName,
      fields: lodgment.fields,
      paymentSummaries,
      worksheet,
      transactionCount: fyTransactions.length,
      uncategorisedCount: lodgment.uncategorisedCount,
    })
  }

  const [sy, ey] = financialYear.split('-').map(Number)

  return (
    <div className="space-y-6">
      <div className="card border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-6 h-6 text-indigo-600" />
              <h2 className="text-2xl font-semibold text-gray-900">Personal Tax Summary</h2>
            </div>
            <p className="text-sm text-gray-600 max-w-2xl">
              Year-end overview for myTax preparation — uses the same figures as{' '}
              {onOpenAtoLodgment ? (
                <button
                  type="button"
                  onClick={onOpenAtoLodgment}
                  className="text-indigo-600 underline hover:text-indigo-800"
                >
                  ATO Lodgment
                </button>
              ) : (
                'ATO Lodgment'
              )}
              (payment summaries, worksheets, and manual overrides).
            </p>
            <p className="text-sm text-indigo-800 mt-1">Taxpayer: {taxpayerName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {listRecentIndividualFinancialYears(6).map((fy) => (
                <option key={fy} value={fy}>
                  FY {fy}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
            >
              <Download className="w-4 h-4" />
              Export Excel pack
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Period: {formatDateAustralian(`${sy}-07-01`)} – {formatDateAustralian(`${ey}-06-30`)} ·{' '}
          {fyTransactions.length} transactions
          {lodgment.uncategorisedCount > 0 && (
            <span className="text-amber-700 ml-2">
              · {lodgment.uncategorisedCount} uncategorised
            </span>
          )}
        </p>
        <div className="mt-3 flex items-center gap-2 text-xs text-green-800 bg-green-50 border border-green-200 rounded-md px-3 py-2">
          <Link2 className="w-3.5 h-3.5 shrink-0" />
          <span>
            Figures on this report match the ATO Lodgment tab for FY {financialYear} (shared
            calculation).
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card bg-green-50 border-green-200">
          <p className="text-sm text-gray-600">Total income (estimate)</p>
          <p className="text-2xl font-bold text-green-700">
            {formatCurrency(lodgment.fields.find((f) => f.id === 'IND_TOTAL_INCOME')?.amount ?? 0)}
          </p>
        </div>
        <div className="card bg-blue-50 border-blue-200">
          <p className="text-sm text-gray-600">Total deductions</p>
          <p className="text-2xl font-bold text-blue-700">
            {formatCurrency(
              lodgment.fields.find((f) => f.id === 'IND_TOTAL_DEDUCTIONS')?.amount ?? 0
            )}
          </p>
        </div>
        <div className="card bg-purple-50 border-purple-200">
          <p className="text-sm text-gray-600">Taxable income (estimate)</p>
          <p className="text-2xl font-bold text-purple-700">
            {formatCurrency(taxableIncome)}
          </p>
        </div>
        <div className="card bg-indigo-50 border-indigo-200">
          <p className="text-sm text-gray-600">Tax withheld</p>
          <p className="text-2xl font-bold text-indigo-700">
            {formatCurrency(lodgment.fields.find((f) => f.id === 'IND_TAX_WITHHELD')?.amount ?? 0)}
          </p>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          Payment summaries (FY {financialYear})
        </h3>
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : paymentTotals.count === 0 ? (
          <p className="text-sm text-gray-500">
            No payment summaries entered. Add employer income statements on the Biz Intel dashboard
            (from myGov income statements).
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2">Employer total</th>
                  <th className="py-2 text-right">Gross</th>
                  <th className="py-2 text-right">Withheld</th>
                </tr>
              </thead>
              <tbody>
                <tr className="font-semibold">
                  <td className="py-2">
                    {paymentTotals.count} payment summar{paymentTotals.count === 1 ? 'y' : 'ies'}
                  </td>
                  <td className="py-2 text-right font-mono">
                    {formatCurrency(paymentTotals.grossPayments)}
                  </td>
                  <td className="py-2 text-right font-mono">
                    {formatCurrency(paymentTotals.taxWithheld)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card border-indigo-100 bg-indigo-50/40">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
          <h3 className="font-semibold text-gray-900">Tax worksheets (FY {financialYear})</h3>
          {onOpenAtoLodgment && (
            <button
              type="button"
              onClick={onOpenAtoLodgment}
              className="text-sm text-indigo-600 underline hover:text-indigo-800"
            >
              Edit worksheets in ATO Lodgment
            </button>
          )}
        </div>
        {worksheetNets.active ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-800">
                Rental schedule ({worksheetNets.rentalCount} propert
                {worksheetNets.rentalCount === 1 ? 'y' : 'ies'})
              </p>
              <p className="mt-2 text-lg font-bold font-mono text-indigo-700">
                Total net rental: {formatCurrency(worksheetNets.rental)}
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-800">
                Capital gains ({worksheetNets.cgtCount} event
                {worksheetNets.cgtCount === 1 ? '' : 's'})
              </p>
              <p className="mt-2 text-lg font-bold font-mono text-indigo-700">
                Total net capital gain: {formatCurrency(worksheetNets.cgt)}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-600">
            No rental or CGT worksheet data for this year.{' '}
            {onOpenAtoLodgment && (
              <button
                type="button"
                onClick={onOpenAtoLodgment}
                className="text-indigo-600 underline hover:text-indigo-800"
              >
                Add worksheets on the ATO Lodgment tab
              </button>
            )}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Income lines (myTax)</h3>
          <dl className="space-y-2 text-sm">
            {incomeFields
              .filter((f) => !f.id.startsWith('IND_TOTAL'))
              .map((f) => (
                <div key={f.id} className="flex justify-between gap-2">
                  <dt className="text-gray-600">{f.label}</dt>
                  <dd className="font-mono font-medium">{formatCurrency(f.amount)}</dd>
                </div>
              ))}
          </dl>
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Deduction lines (myTax)</h3>
          <dl className="space-y-2 text-sm">
            {deductionFields
              .filter((f) => f.id !== 'IND_TOTAL_DEDUCTIONS')
              .map((f) => (
                <div key={f.id} className="flex justify-between gap-2">
                  <dt className="text-gray-600">{f.label}</dt>
                  <dd className="font-mono font-medium">{formatCurrency(f.amount)}</dd>
                </div>
              ))}
          </dl>
        </div>
      </div>

      {taxFields.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Tax & offsets</h3>
          <dl className="space-y-2 text-sm">
            {taxFields.map((f) => (
              <div key={f.id} className="flex justify-between gap-2">
                <dt className="text-gray-600">{f.label}</dt>
                <dd className="font-mono font-medium">{formatCurrency(f.amount)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <MyTaxOutsideAppChecklist
        financialYear={financialYear}
        fields={lodgment.fields}
        taxableIncome={taxableIncome}
      />

      <div className="card bg-amber-50 border-amber-200 text-sm text-amber-900">
        <strong>Bank hints (informational):</strong> Interest{' '}
        {formatCurrency(lodgment.bankHints.interest)}, work-related debits{' '}
        {formatCurrency(lodgment.bankHints.workDeductions)}, other income credits{' '}
        {formatCurrency(lodgment.bankHints.otherIncome)}. Confirm all amounts in{' '}
        <a
          href="https://my.gov.au"
          target="_blank"
          rel="noopener noreferrer"
          className="underline inline-flex items-center gap-1"
        >
          myTax
          <ExternalLink className="w-3 h-3" />
        </a>
        .
      </div>
    </div>
  )
}
