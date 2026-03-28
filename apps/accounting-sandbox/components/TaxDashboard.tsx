'use client'

import { AlertTriangle, DollarSign, Eye, Receipt, TrendingDown, TrendingUp } from 'lucide-react'

interface TaxDashboardProps {
  totalIncome: number
  totalExpenses: number
  netProfit: number
  gstPayable: number
  gstClaimable: number
  directorsLoanBalance: number
  personalSpendingNonDeductible: number
  formatCurrency?: (value: number) => string
  showDirectorsLoanFilter: boolean
  onToggleDirectorsLoanFilter: () => void
}

export function TaxDashboard({
  totalIncome,
  totalExpenses,
  netProfit,
  gstPayable,
  gstClaimable,
  directorsLoanBalance,
  personalSpendingNonDeductible,
  formatCurrency,
  showDirectorsLoanFilter,
  onToggleDirectorsLoanFilter,
}: TaxDashboardProps) {
  // Ensure a working formatter even if not passed from parent
  const format = formatCurrency || ((amount: number) =>
    new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount)
  )

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-4">Business Summary</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Business Income */}
        <div className="card bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Business Income</p>
              <p className="text-2xl font-bold text-green-600">
                {format(totalIncome)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Total Business</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>

        {/* Total Tax Deductions */}
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Tax Deductions</p>
              <p className="text-2xl font-bold text-blue-600">
                {format(totalExpenses)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Total Business</p>
            </div>
            <Receipt className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        {/* Net Profit */}
        <div className="card bg-purple-50 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Net Profit</p>
              <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {format(netProfit)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Income - Expenses</p>
            </div>
            {netProfit >= 0 ? (
              <TrendingUp className="w-8 h-8 text-green-600" />
            ) : (
              <TrendingDown className="w-8 h-8 text-red-600" />
            )}
          </div>
        </div>

        {/* GST Payable */}
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">GST Payable</p>
              <p className="text-2xl font-bold text-yellow-600">
                {format(gstPayable)}
              </p>
              <p className="text-xs text-gray-500 mt-1">10% of Total Business Income</p>
            </div>
            <DollarSign className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        {/* GST Claimable */}
        <div className="card bg-orange-50 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">GST Claimable</p>
              <p className="text-2xl font-bold text-orange-600">
                {format(gstClaimable)}
              </p>
              <p className="text-xs text-gray-500 mt-1">10% of Total Taxable Business Expenses</p>
            </div>
            <Receipt className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        {/* Director's Loan Balance */}
        <div className="card bg-indigo-50 border-indigo-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-1">Director's Loan Balance</p>
              <p className={`text-2xl font-bold ${directorsLoanBalance >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                {format(Math.abs(directorsLoanBalance))}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {directorsLoanBalance >= 0 ? 'Company owes Director' : 'Director owes Company'}
              </p>
              <p className="text-xs text-blue-600 mt-1 font-medium">
                ⚡ Auto-synced with Personal transactions
              </p>
              <button
                onClick={onToggleDirectorsLoanFilter}
                className="mt-2 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-md transition-colors flex items-center gap-1.5"
                title="View Director's Loan and Personal transaction details"
              >
                <Eye className="w-3.5 h-3.5" />
                {showDirectorsLoanFilter ? 'Hide Details' : 'View Details'}
              </button>
            </div>
            <DollarSign className="w-8 h-8 text-indigo-600" />
          </div>
        </div>
      </div>

      {/* Non-Deductible Section */}
      {personalSpendingNonDeductible > 0 && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Non-Deductible Expenses</h3>
          <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
            <strong>💡 Note:</strong> Personal expenses are automatically reflected in Director's Loan Balance. 
            Personal debits reduce the balance (Director owes Company), and personal credits increase it (Company owes Director).
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700 mb-1">Personal Spending (Excluded from Net Profit)</p>
              <p className="text-2xl font-bold text-red-600">
                {format(personalSpendingNonDeductible)}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Automatically synced to Director's Loan Balance above
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>
      )}
    </div>
  )
}
