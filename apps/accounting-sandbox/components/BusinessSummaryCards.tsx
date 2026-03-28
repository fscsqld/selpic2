'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Receipt, DollarSign, AlertTriangle, Eye, Edit2, Check, X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency-format'

interface BusinessSummaryCardsProps {
  totalIncome: number
  totalExpenses: number
  netProfit: number
  gstPayable: number
  gstClaimable: number
  directorsLoanBalance: number
  personalSpendingNonDeductible: number
  openingDirectorLoanBalance?: number
  onOpeningBalanceChange?: (value: number) => void
  onViewDirectorsLoanDetails?: (show: boolean) => void
  showDirectorsLoanFilter?: boolean
  accountType?: 'individual' | 'company' | 'sole_trader'
}

export function BusinessSummaryCards({
  totalIncome = 0,
  totalExpenses = 0,
  netProfit = 0,
  gstPayable = 0,
  gstClaimable = 0,
  directorsLoanBalance = 0,
  personalSpendingNonDeductible = 0,
  openingDirectorLoanBalance = 1000,
  onOpeningBalanceChange,
  onViewDirectorsLoanDetails,
  showDirectorsLoanFilter = false,
  accountType = 'company',
}: BusinessSummaryCardsProps) {
  const [isEditingOpeningBalance, setIsEditingOpeningBalance] = useState(false)
  const [tempOpeningBalance, setTempOpeningBalance] = useState(openingDirectorLoanBalance.toString())
  
  // 🔧 Determine user type based on business activity
  // If there's business income/expenses, it's a company/mixed account
  // If only personal transactions, it's an individual user
  const hasBusinessActivity = totalIncome > 0 || totalExpenses > 0
  const isCompanyOrMixedAccount = hasBusinessActivity
  const isIndividualUser = !hasBusinessActivity

  const handleToggleDirectorsLoanFilter = () => {
    if (onViewDirectorsLoanDetails) {
      onViewDirectorsLoanDetails(!showDirectorsLoanFilter)
    }
  }

  const handleSaveOpeningBalance = () => {
    const value = parseFloat(tempOpeningBalance)
    if (!isNaN(value) && onOpeningBalanceChange) {
      onOpeningBalanceChange(value)
      setIsEditingOpeningBalance(false)
    }
  }

  const handleCancelOpeningBalance = () => {
    setTempOpeningBalance(openingDirectorLoanBalance.toString())
    setIsEditingOpeningBalance(false)
  }

  // Update temp value when prop changes (only if not editing)
  useEffect(() => {
    if (!isEditingOpeningBalance) {
      setTempOpeningBalance(openingDirectorLoanBalance.toString())
    }
  }, [openingDirectorLoanBalance, isEditingOpeningBalance])

  // Ensure all values are valid numbers (handle NaN, null, undefined)
  const safeTotalIncome = Number.isFinite(totalIncome) ? totalIncome : 0
  const safeTotalExpenses = Number.isFinite(totalExpenses) ? totalExpenses : 0
  const safeNetProfit = Number.isFinite(netProfit) ? netProfit : 0
  const safeGstPayable = Number.isFinite(gstPayable) ? gstPayable : 0
  const safeGstClaimable = Number.isFinite(gstClaimable) ? gstClaimable : 0
  const safeDirectorsLoanBalance = Number.isFinite(directorsLoanBalance) ? directorsLoanBalance : 0
  const safePersonalSpending = Number.isFinite(personalSpendingNonDeductible) ? personalSpendingNonDeductible : 0

  const isIndividual = accountType === 'individual'
  const summaryTitle = isIndividual ? 'Individual Summary' : 'Business Summary'
  const incomeLabel = isIndividual ? 'Total Income' : 'Total Business Income'
  const expensesLabel = isIndividual ? 'Total Expenses' : 'Total Tax Deductions'
  const incomeSubLabel = isIndividual ? 'All Income' : 'Total Business'
  const expensesSubLabel = isIndividual ? 'All Expenses' : 'Total Business'

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-4">{summaryTitle}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income */}
        <div className="card bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{incomeLabel}</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(safeTotalIncome)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {incomeSubLabel}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>

        {/* Total Expenses */}
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{expensesLabel}</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(safeTotalExpenses)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {expensesSubLabel}
              </p>
            </div>
            <Receipt className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        {/* Net Profit */}
        <div className="card bg-purple-50 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Net Profit</p>
              <p className={`text-2xl font-bold ${safeNetProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(safeNetProfit)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Income - Expenses
              </p>
            </div>
            {safeNetProfit >= 0 ? (
              <TrendingUp className="w-8 h-8 text-green-600" />
            ) : (
              <TrendingDown className="w-8 h-8 text-red-600" />
            )}
          </div>
        </div>

        {/* GST Payable (Company/Sole Trader only - Hidden for Individual Users) */}
        {accountType !== 'individual' && (
          <div className="card bg-yellow-50 border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">GST Payable</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(safeGstPayable)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  10% of Total Business Income
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        )}

        {/* GST Claimable (Company/Sole Trader only - Hidden for Individual Users) */}
        {accountType !== 'individual' && (
          <div className="card bg-orange-50 border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">GST Claimable</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(safeGstClaimable)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  10% of Total Taxable Business Expenses
                </p>
              </div>
              <Receipt className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        )}

        {/* Director's Loan Balance (Company/Mixed only - Hidden for Individual Users) */}
        {accountType !== 'individual' && (
          <div className="card bg-indigo-50 border-indigo-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm text-gray-600">
                    {isCompanyOrMixedAccount ? "Director's Loan Balance" : "Personal Balance"}
                  </p>
                  {!isEditingOpeningBalance && (
                    <button
                      onClick={() => setIsEditingOpeningBalance(true)}
                      className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                      title="Edit Opening Balance"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit Opening
                    </button>
                  )}
                </div>
                <p className={`text-2xl font-bold ${safeDirectorsLoanBalance >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(safeDirectorsLoanBalance))}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {isCompanyOrMixedAccount 
                    ? (safeDirectorsLoanBalance >= 0 ? 'Company owes Director' : 'Director owes Company')
                    : (safeDirectorsLoanBalance >= 0 ? 'Positive balance' : 'Negative balance')
                  }
                </p>
                
                {/* Opening Balance Input */}
                {isEditingOpeningBalance ? (
                  <div className="mt-2 flex items-center gap-2">
                    <label className="text-xs text-gray-600">Opening:</label>
                    <input
                      type="number"
                      value={tempOpeningBalance}
                      onChange={(e) => setTempOpeningBalance(e.target.value)}
                      className="w-24 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="1000.00"
                      step="0.01"
                    />
                    <button
                      onClick={handleSaveOpeningBalance}
                      className="p-1 text-green-600 hover:text-green-700"
                      title="Save"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCancelOpeningBalance}
                      className="p-1 text-red-600 hover:text-red-700"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">
                    Opening: {formatCurrency(openingDirectorLoanBalance)}
                  </p>
                )}
                
                <p className="text-xs text-blue-600 mt-1 font-medium">
                  {isCompanyOrMixedAccount 
                    ? "⚡ Personal transactions auto-synced (excluded from business)"
                    : "⚡ Your personal transactions balance"
                  }
                </p>
                <button
                  onClick={handleToggleDirectorsLoanFilter}
                  className="mt-2 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-md transition-colors flex items-center gap-1.5"
                  title={isCompanyOrMixedAccount 
                    ? "View Director's Loan and Personal transaction details"
                    : "View Personal transaction details"
                  }
                >
                  <Eye className="w-3.5 h-3.5" />
                  {showDirectorsLoanFilter ? 'Hide Details' : 'View Details'}
                </button>
              </div>
              <DollarSign className="w-8 h-8 text-indigo-600" />
            </div>
          </div>
        )}
      </div>

      {/* Non-Deductible Section (Company/Sole Trader only - Hidden for Individual Users) */}
      {safePersonalSpending > 0 && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            {accountType === 'individual' 
              ? 'Personal Spending' 
              : 'Personal Transactions (Excluded from Business)'}
          </h3>
          <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
            <strong>🔧 Important:</strong> Personal transactions (`department: 'personal'`) are <strong>COMPLETELY EXCLUDED</strong> from:
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              {accountType === 'individual' ? (
                <>
                  <li>Tax calculations (not tax-deductible)</li>
                  <li>Business expense reports</li>
                </>
              ) : (
                <>
                  <li>Total Business Income</li>
                  <li>Total Business Expenses</li>
                  <li>Net Profit</li>
                  <li>GST Payable/Claimable</li>
                  <li>Tax calculations</li>
                </>
              )}
            </ul>
            {accountType !== 'individual' && (
              <>
                <p className="mt-2 font-medium">For company accounts:</p>
                <p>Personal expenses are automatically reflected in Director's Loan Balance. 
                Personal debits reduce the balance (Director owes Company), and personal credits increase it (Company owes Director).</p>
              </>
            )}
            {accountType === 'individual' && (
              <p className="mt-2">
                Personal spending is tracked separately for your personal financial management. 
                These transactions are not included in any business calculations or tax deductions.
              </p>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700 mb-1">
                {accountType === 'individual' 
                  ? 'Personal Spending' 
                  : 'Personal Spending (Excluded from Net Profit)'}
              </p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(safePersonalSpending)}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {accountType === 'individual' 
                  ? "Personal transactions are tracked separately from business activities"
                  : (directorsLoanBalance !== 0 
                      ? "Automatically synced to Director's Loan Balance above"
                      : "Personal transactions are tracked separately from business")}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>
      )}
    </div>
  )
}
