'use client'

import { useMemo, useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency-format'
import { formatDateAustralian } from '@/lib/utils/date-format'

interface Transaction {
  date: string
  debit: number | null
  credit: number | null
  category?: string
  department?: string
  id?: string
  isPayrollTransaction?: boolean
}

interface RealTimePLViewProps {
  transactions: Transaction[]
}

export function RealTimePLView({ transactions }: RealTimePLViewProps) {
  // Force re-render when transactions change
  const [renderKey, setRenderKey] = useState(0)
  
  useEffect(() => {
    // Force re-render when transactions array reference changes
    setRenderKey(prev => prev + 1)
    console.log('[Real-Time P&L] Transactions prop changed, recalculating P&L. Transaction count:', transactions.length)
  }, [transactions.length, JSON.stringify(transactions.map(tx => ({ id: tx.id, category: tx.category, debit: tx.debit })))])
  // Get current month's date range
  const currentMonth = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const startDate = new Date(year, month, 1)
    const endDate = new Date(year, month + 1, 0) // Last day of current month
    
    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
      monthName: startDate.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }),
    }
  }, [])

  // Calculate current month's P&L
  const monthlyPL = useMemo(() => {
    const monthTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.date)
      const startDate = new Date(currentMonth.start)
      const endDate = new Date(currentMonth.end)
      return txDate >= startDate && txDate <= endDate
    })

    const revenue = monthTransactions
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

    const expenses = monthTransactions
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
      .reduce((sum, tx) => {
        const amount = Math.abs(tx.debit || 0)
        // Debug log for payroll expenses
        if (tx.category === 'EXPENSE_WAGES_SALARIES' || tx.category === 'EXPENSE_DIRECTORS_FEES' || tx.category === 'EXPENSE_SUPERANNUATION') {
          console.log('[Real-Time P&L] Payroll expense:', {
            id: tx.id,
            category: tx.category,
            amount,
            description: tx.description
          })
        }
        return sum + amount
      }, 0)

    // Subtract refunds from expenses
    const refunds = monthTransactions
      .filter(tx => {
        const isBusiness = tx.department !== 'personal' && 
                          tx.department !== 'unknown'
        const isRefund = tx.category === 'INCOME_REFUND_REIMBURSEMENT' ||
                        (tx.description?.toUpperCase().includes('REFUND') && tx.credit)
        return isBusiness && tx.credit && isRefund
      })
      .reduce((sum, tx) => sum + Math.abs(tx.credit || 0), 0)

    const netExpenses = expenses - refunds
    const netProfit = revenue - netExpenses

    return {
      revenue,
      expenses: netExpenses,
      netProfit,
      transactionCount: monthTransactions.length,
    }
  }, [transactions, currentMonth])

  return (
    <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Real-Time P&L View</h3>
        </div>
        <span className="text-sm text-gray-600 font-medium">{currentMonth.monthName}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Revenue */}
        <div className="bg-white rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Revenue</p>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(monthlyPL.revenue)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            This month's income
          </p>
        </div>

        {/* Expenses */}
        <div className="bg-white rounded-lg p-4 border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Expenses</p>
            <TrendingDown className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(monthlyPL.expenses)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            This month's costs
          </p>
        </div>

        {/* Net Profit */}
        <div className={`bg-white rounded-lg p-4 border ${
          monthlyPL.netProfit >= 0 
            ? 'border-green-300 bg-green-50' 
            : 'border-red-300 bg-red-50'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Net Profit</p>
            <DollarSign className={`w-4 h-4 ${
              monthlyPL.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
            }`} />
          </div>
          <p className={`text-2xl font-bold ${
            monthlyPL.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(monthlyPL.netProfit)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {monthlyPL.netProfit >= 0 ? 'Profit' : 'Loss'} this month
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Based on {monthlyPL.transactionCount} transactions in {currentMonth.monthName}
        </p>
        {process.env.NODE_ENV === 'development' && (
          <p className="text-xs text-gray-400 text-center mt-1">
            Debug: Expenses include {monthlyPL.expenses > 0 ? `${Math.round(monthlyPL.expenses)}` : '0'} in payroll-related costs
          </p>
        )}
      </div>
    </div>
  )
}
