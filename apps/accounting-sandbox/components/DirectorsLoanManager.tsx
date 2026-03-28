/**
 * Director's Loan 관리 컴포넌트
 * 
 * PAYG 미등록 상태에서 법인 계좌의 사적 지출을 추적하는 컴포넌트
 */

'use client'

import { useState, useEffect } from 'react'
import { DirectorsLoanManager, DirectorsLoanSummary } from '@/lib/directors-loan/manager'
import { DirectorsLoanTransaction } from '@/lib/directors-loan/detector'
import { formatCurrency } from '@/lib/utils/currency-format'

export function DirectorsLoanManagerComponent() {
  const [loans, setLoans] = useState<DirectorsLoanTransaction[]>([])
  const [summary, setSummary] = useState<DirectorsLoanSummary | null>(null)

  useEffect(() => {
    // 로컬 스토리지에서 Director's Loan 데이터 로드
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('directors_loans')
      if (stored) {
        const parsedLoans = JSON.parse(stored)
        setLoans(parsedLoans)
        
        const manager = new DirectorsLoanManager()
        const loanSummary = manager.generateSummary(parsedLoans)
        setSummary(loanSummary)
      }
    }
  }, [])

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="mb-4">
        <h2 className="text-2xl font-semibold">Director's Loan Management</h2>
        <p className="text-sm text-gray-600 mt-1">
          Track personal withdrawals and advances from company account (PAYG not registered)
        </p>
      </div>

      {summary && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded">
            <div className="text-sm text-gray-600">Total Loans</div>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(summary.totalLoans)}
            </div>
          </div>
          <div className="p-4 bg-green-50 rounded">
            <div className="text-sm text-gray-600">Total Repayments</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.totalRepayments)}
            </div>
          </div>
          <div className={`p-4 rounded ${
            summary.currentBalance > 0 ? 'bg-red-50' : 'bg-gray-50'
          }`}>
            <div className="text-sm text-gray-600">Current Balance</div>
            <div className={`text-2xl font-bold ${
              summary.currentBalance > 0 ? 'text-red-600' : 'text-gray-600'
            }`}>
              {formatCurrency(summary.currentBalance)}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="font-semibold">Recent Transactions</h3>
        {loans.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No Director's Loan transactions found. 
            <br />
            <span className="text-sm">Transactions will be automatically detected from bank statements.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loans.map((loan, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-sm">{loan.date}</td>
                    <td className="px-4 py-2 text-sm">{loan.description}</td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        loan.isRepayment 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {loan.isRepayment ? 'Repayment' : loan.loanType}
                      </span>
                    </td>
                    <td className={`px-4 py-2 text-sm text-right font-medium ${
                      loan.isRepayment ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {loan.isRepayment ? '+' : '-'}{formatCurrency(loan.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

