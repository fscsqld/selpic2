'use client'

import { useMemo } from 'react'
import { Calculator, AlertCircle, Info } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency-format'

interface Transaction {
  date: string
  debit: number | null
  credit: number | null
  category?: string
  department?: string
}

interface TaxProvisionProps {
  transactions: Transaction[]
  currentFinancialYear?: {
    start: string
    end: string
  }
}

/**
 * Calculate Company Tax Provision based on current profit
 * Australian Company Tax Rate: 30% (for base rate entities) or 25% (for small business)
 * Small business threshold: $50M aggregated turnover
 */
export function TaxProvision({ transactions, currentFinancialYear }: TaxProvisionProps) {
  // Calculate taxable income for current financial year
  const taxCalculation = useMemo(() => {
    // Get current financial year (July 1 to June 30)
    const now = new Date()
    const month = now.getMonth() + 1 // 1-12
    const year = now.getFullYear()
    
    let fyStart: Date
    let fyEnd: Date
    
    if (month >= 7) {
      // Current FY: July 1 (this year) to June 30 (next year)
      fyStart = new Date(year, 6, 1) // July 1
      fyEnd = new Date(year + 1, 5, 30) // June 30
    } else {
      // Current FY: July 1 (last year) to June 30 (this year)
      fyStart = new Date(year - 1, 6, 1) // July 1
      fyEnd = new Date(year, 5, 30) // June 30
    }

    // Filter transactions for current financial year
    const fyTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.date)
      return txDate >= fyStart && txDate <= fyEnd
    })

    // Calculate taxable income (revenue - expenses)
    const revenue = fyTransactions
      .filter(tx => {
        const isBusiness = tx.department !== 'personal' && 
                          tx.department !== 'unknown' &&
                          (tx.department === 'cleaning' || 
                           tx.department === 'sticker' || 
                           !tx.department)
        
        const isRefund = tx.category === 'INCOME_REFUND_REIMBURSEMENT' ||
                        (tx.description?.toUpperCase().includes('REFUND') && tx.credit)
        
        return isBusiness &&
               tx.credit && 
               tx.category?.startsWith('INCOME_') &&
               tx.category !== 'TRANSFER_INTERNAL' &&
               tx.category !== 'NON_TAXABLE_CASH_DEPOSIT' &&
               !isRefund
      })
      .reduce((sum, tx) => sum + Math.abs(tx.credit || 0), 0)

    const expenses = fyTransactions
      .filter(tx => {
        const isBusiness = tx.department !== 'personal' && 
                          tx.department !== 'unknown' &&
                          (tx.department === 'cleaning' || 
                           tx.department === 'sticker' || 
                           !tx.department)
        
        return isBusiness &&
               tx.debit &&
               tx.category?.startsWith('EXPENSE_') &&
               tx.category !== 'TRANSFER_INTERNAL' &&
               tx.category !== 'LIABILITY_DIRECTORS_LOAN' &&
               tx.category !== 'EXPENSE_DIRECTOR_LOAN_REPAYMENT'
      })
      .reduce((sum, tx) => sum + Math.abs(tx.debit || 0), 0)

    // Subtract refunds from expenses
    const refunds = fyTransactions
      .filter(tx => {
        const isBusiness = tx.department !== 'personal' && 
                          tx.department !== 'unknown'
        const isRefund = tx.category === 'INCOME_REFUND_REIMBURSEMENT' ||
                        (tx.description?.toUpperCase().includes('REFUND') && tx.credit)
        return isBusiness && tx.credit && isRefund
      })
      .reduce((sum, tx) => sum + Math.abs(tx.credit || 0), 0)

    const netExpenses = expenses - refunds
    const taxableIncome = revenue - netExpenses

    // Determine tax rate (assuming small business for now - can be configured)
    // Small business: 25% (aggregated turnover < $50M)
    // Base rate: 30% (aggregated turnover >= $50M)
    const isSmallBusiness = true // TODO: Get from business profile
    const taxRate = isSmallBusiness ? 0.25 : 0.30

    // Calculate tax provision
    const taxProvision = taxableIncome > 0 ? taxableIncome * taxRate : 0

    return {
      taxableIncome,
      taxRate: taxRate * 100,
      taxProvision,
      fyStart: fyStart.toISOString().split('T')[0],
      fyEnd: fyEnd.toISOString().split('T')[0],
      isSmallBusiness,
    }
  }, [transactions, currentFinancialYear])

  return (
    <div className="card bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Tax Provision (Company Tax)</h3>
        </div>
        <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded">
          FY {new Date(taxCalculation.fyStart).getFullYear()}-{new Date(taxCalculation.fyEnd).getFullYear()}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Taxable Income */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Taxable Income</p>
          <p className={`text-2xl font-bold ${
            taxCalculation.taxableIncome >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(taxCalculation.taxableIncome)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Revenue - Expenses
          </p>
        </div>

        {/* Tax Rate */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Tax Rate</p>
          <p className="text-2xl font-bold text-purple-600">
            {taxCalculation.taxRate}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {taxCalculation.isSmallBusiness ? 'Small Business' : 'Base Rate'}
          </p>
        </div>

        {/* Tax Provision */}
        <div className="bg-white rounded-lg p-4 border border-purple-300 bg-purple-50">
          <p className="text-sm text-gray-600 mb-1">Estimated Tax Provision</p>
          <p className="text-2xl font-bold text-purple-600">
            {formatCurrency(taxCalculation.taxProvision)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Estimated Company Tax
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800">
          <p className="font-medium mb-1">Tax Provision Information:</p>
          <ul className="list-disc list-inside space-y-0.5 text-blue-700">
            <li>This is an <strong>estimate</strong> based on current financial year transactions</li>
            <li>Actual tax liability may vary based on deductions, offsets, and ATO assessments</li>
            <li>Small business rate (25%) applies if aggregated turnover &lt; $50M</li>
            <li>Base rate (30%) applies if aggregated turnover ≥ $50M</li>
            <li>Consult with your accountant for accurate tax planning</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
