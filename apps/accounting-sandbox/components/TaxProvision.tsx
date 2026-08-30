'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calculator, AlertCircle, Info } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency-format'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { resolveCompanyTaxRate } from '@/lib/ato-lodgment/business-profile-tax'
import { calculatePeriodTaxProvision } from '@/lib/utils/period-tax-provision'
import type { Transaction } from '@/lib/utils/business-calculations'

interface TaxProvisionProps {
  /** Already filtered to the selected P&L period (same rows as Real-Time P&L). */
  transactions: Transaction[]
  periodLabel?: string
  periodStart?: string
  periodEnd?: string
  gstRegistered?: boolean
  /** @deprecated Prefer periodLabel + period-scoped transactions */
  currentFinancialYear?: { start: string; end: string }
}

/**
 * Company tax provision for the selected P&L period — not a silent full-FY overlay.
 * Taxable Income / provision use tax (ex GST) estimates; cash P&L stays visible.
 */
export function TaxProvision({
  transactions,
  periodLabel = 'Selected period',
  periodStart,
  periodEnd,
  gstRegistered = true,
  currentFinancialYear,
}: TaxProvisionProps) {
  const [companyTaxRate, setCompanyTaxRate] = useState(0.25)
  const [isSmallBusiness, setIsSmallBusiness] = useState(true)
  const [profileGstRegistered, setProfileGstRegistered] = useState(gstRegistered)

  useEffect(() => {
    const load = async () => {
      try {
        await indexedDBStorage.init()
        const profile = await indexedDBStorage.getBusinessProfile()
        const rate = resolveCompanyTaxRate(profile)
        setCompanyTaxRate(rate)
        setIsSmallBusiness(rate < 0.3)
        if (typeof profile?.gstRegistered === 'boolean') {
          setProfileGstRegistered(profile.gstRegistered)
        }
      } catch {
        /* keep defaults */
      }
    }
    load()
    const onUpdate = () => load()
    window.addEventListener('businessProfileUpdated', onUpdate)
    return () => window.removeEventListener('businessProfileUpdated', onUpdate)
  }, [])

  const effectiveGstRegistered = profileGstRegistered && gstRegistered

  const tax = useMemo(
    () =>
      calculatePeriodTaxProvision(
        transactions,
        companyTaxRate,
        'company',
        effectiveGstRegistered
      ),
    [transactions, companyTaxRate, effectiveGstRegistered]
  )

  const showGstDual =
    effectiveGstRegistered &&
    (Math.abs(tax.taxableIncome - tax.taxableIncomeCash) > 0.005 ||
      Math.abs(tax.revenueExGst - tax.revenue) > 0.005 ||
      Math.abs(tax.netExpensesExGst - tax.netExpenses) > 0.005)

  const rangeHint =
    periodStart && periodEnd
      ? ` (${periodStart} → ${periodEnd})`
      : currentFinancialYear
        ? ` (${currentFinancialYear.start} → ${currentFinancialYear.end})`
        : ''

  return (
    <div className="card bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 mb-6">
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Calculator className="w-6 h-6 text-purple-600" />
          <h3 className="text-xl font-semibold text-gray-900">Company Tax Provision</h3>
        </div>
        <span className="text-sm text-gray-600 font-medium">{periodLabel}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-lg p-4 border border-purple-100">
          <p className="text-sm text-gray-600 mb-1">
            {showGstDual ? 'Taxable Income (tax est.)' : 'Taxable Income'}
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(tax.taxableIncome)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {showGstDual ? 'Ex GST · this P&L period' : 'This P&L period'}
          </p>
          {showGstDual && (
            <p className="text-xs text-gray-600 mt-1.5">
              Cash P&amp;L (GST incl.):{' '}
              <span className="font-semibold">
                {formatCurrency(tax.taxableIncomeCash)}
              </span>
            </p>
          )}
        </div>
        <div className="bg-white rounded-lg p-4 border border-purple-100">
          <p className="text-sm text-gray-600 mb-1">Tax Rate</p>
          <p className="text-2xl font-bold text-purple-600">{tax.taxRatePercent}%</p>
          <p className="text-xs text-gray-500 mt-1">
            {isSmallBusiness ? 'Small Business' : 'Base Rate'} — from Settings
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-purple-100">
          <p className="text-sm text-gray-600 mb-1">Estimated Tax Provision</p>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(tax.taxProvision)}
          </p>
          {showGstDual && (
            <p className="text-xs text-gray-500 mt-1">On tax (ex GST) estimate</p>
          )}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white/80 rounded-lg p-3 border border-purple-100 text-sm">
          <p className="text-gray-500">Revenue (this period)</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(tax.revenue)}
            <span className="text-xs font-normal text-gray-500 ml-1">GST incl.</span>
          </p>
          {showGstDual && (
            <p className="text-xs text-gray-600 mt-1">
              Ex GST (est.): {formatCurrency(tax.revenueExGst)}
            </p>
          )}
        </div>
        <div className="bg-white/80 rounded-lg p-3 border border-purple-100 text-sm">
          <p className="text-gray-500">Expenses (this period)</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(tax.netExpenses)}
            <span className="text-xs font-normal text-gray-500 ml-1">GST incl.</span>
          </p>
          {showGstDual && (
            <p className="text-xs text-gray-600 mt-1">
              Ex GST (est.): {formatCurrency(tax.netExpensesExGst)} · FREE at face
            </p>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-600 mb-4">
        {showGstDual ? (
          <>
            Tax est.: {formatCurrency(tax.revenueExGst)} −{' '}
            {formatCurrency(tax.netExpensesExGst)} ={' '}
            <strong>{formatCurrency(tax.taxableIncome)}</strong>
            {' · '}
            Cash: {formatCurrency(tax.taxableIncomeCash)}
          </>
        ) : (
          <>
            {formatCurrency(tax.revenue)} − {formatCurrency(tax.netExpenses)} ={' '}
            <strong>{formatCurrency(tax.taxableIncome)}</strong>
          </>
        )}
        {' · '}
        {periodLabel}
        {rangeHint} · {tax.txCount} txs · bank expenses {tax.bankExpenseCount} · cash/manual{' '}
        {tax.cashExpenseCount}
      </p>

      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Matches Real-Time P&amp;L period</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>
              <strong>Cash (GST incl.)</strong> matches bank / Business Summary. Do not replace it
              with the tax estimate.
            </li>
            <li>
              <strong>Taxable Income (tax est.)</strong> = income − 1A, expenses − 1B. GST-FREE
              purchases stay at face value (not ÷11).
            </li>
            <li>
              ATO company tax is assessed on the <strong>full financial year</strong>. Switch the
              banner to FY / Full statement for a year-to-date estimate.
            </li>
            <li>Director reimbursements / share capital / ATO GST refunds are excluded here</li>
            <li>Rate matches Business Profile and ATO Lodgment → CTR</li>
          </ul>
        </div>
      </div>

      {tax.taxableIncome < 0 && (
        <div className="mt-4 flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800">
            This period shows a loss on the tax estimate. Tax provision is $0.00. Losses may be
            carried forward when the full year is lodged.
            {showGstDual &&
              Math.abs(tax.taxableIncomeCash - tax.taxableIncome) > 0.005 && (
                <> Cash P&amp;L is {formatCurrency(tax.taxableIncomeCash)}.</>
              )}
          </p>
        </div>
      )}
    </div>
  )
}
