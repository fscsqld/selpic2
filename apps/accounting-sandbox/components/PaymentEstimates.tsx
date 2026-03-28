'use client'

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { DollarSign, TrendingUp, TrendingDown, FileText, Calendar } from 'lucide-react'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { calculatePaymentEstimates } from '@/lib/tax-dashboard/payment-estimator'
import { formatCurrency } from '@/lib/utils/currency-format'
import { formatDateAustralian } from '@/lib/utils/date-format'

interface PaymentEstimatesProps {
  transactions: Array<{
    date: string
    description: string
    debit: number | null
    credit: number | null
    category?: string
    requiresPAYG?: boolean
    isPayrollTransaction?: boolean
    payrollType?: 'employee' | 'director' | 'contractor' | 'partner'
    noABNWarning?: {
      shouldWarn: boolean
      withholdingAmount?: number
    }
    gstInfo?: {
      isGSTIncluded: boolean
      gstType: 'INCLUDED' | 'EXCLUDED' | 'FREE'
      gstAmount?: number
      netAmount?: number
    }
  }>
}

export function PaymentEstimates({ transactions }: PaymentEstimatesProps) {
  const [businessProfile, setBusinessProfile] = useState<{
    companyName: string
    abn: string
    gstReportingCycle: 'Monthly' | 'Quarterly'
    paygReportingCycle: 'Monthly' | 'Quarterly'
  } | null>(null)

  useEffect(() => {
    loadBusinessProfile()
    
    // Listen for business profile updates
    const handleProfileUpdate = () => {
      loadBusinessProfile()
    }
    window.addEventListener('businessProfileUpdated', handleProfileUpdate)
    
    return () => {
      window.removeEventListener('businessProfileUpdated', handleProfileUpdate)
    }
  }, [])

  const loadBusinessProfile = async () => {
    try {
      const profile = await indexedDBStorage.getBusinessProfile()
      setBusinessProfile(profile)
    } catch (err) {
      console.error('Failed to load business profile:', err)
    }
  }

  const paymentEstimate = useMemo(() => {
    if (!businessProfile || transactions.length === 0) {
      return null
    }
    return calculatePaymentEstimates(businessProfile, transactions)
  }, [businessProfile, transactions])

  if (!businessProfile) {
    return null
  }

  if (!paymentEstimate) {
    return (
      <div className="card mb-8">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-semibold">Payment Estimates</h2>
        </div>
        <div className="p-6 text-center text-gray-500">
          <p>No transactions found for current period</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card mb-8">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-semibold">Payment Estimates</h2>
      </div>

      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Calendar className="w-4 h-4" />
          <span className="font-medium">Period:</span>
          <span>{paymentEstimate.period.label}</span>
          <span className="text-gray-500">
            ({formatDateAustralian(paymentEstimate.period.startDate)} - {formatDateAustralian(paymentEstimate.period.endDate)})
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* GST Estimate */}
        <div className={`p-6 rounded-lg border-2 ${
          paymentEstimate.gstRefund
            ? 'bg-green-50 border-green-300'
            : 'bg-blue-50 border-blue-300'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText className={`w-5 h-5 ${
                paymentEstimate.gstRefund ? 'text-green-600' : 'text-blue-600'
              }`} />
              <h3 className="font-semibold text-gray-700">GST Estimate</h3>
            </div>
            {paymentEstimate.gstRefund ? (
              <TrendingDown className="w-5 h-5 text-green-600" />
            ) : (
              <TrendingUp className="w-5 h-5 text-blue-600" />
            )}
          </div>
          <p className={`text-2xl font-bold ${
            paymentEstimate.gstRefund ? 'text-green-700' : 'text-blue-700'
          }`}>
            {paymentEstimate.gstRefund ? '-' : ''}{formatCurrency(Math.abs(paymentEstimate.gstEstimated))}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {paymentEstimate.gstRefund ? 'Refundable' : 'Payable'}
          </p>
        </div>

        {/* PAYG Estimate */}
        <div className="p-6 rounded-lg border-2 bg-purple-50 border-purple-300">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-gray-700">PAYG Estimate</h3>
            </div>
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-700">
            {formatCurrency(paymentEstimate.paygEstimated)}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Withholding Tax
          </p>
        </div>

        {/* Total Estimate */}
        <div className="p-6 rounded-lg border-2 bg-gray-50 border-gray-300">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-700">Total Estimate</h3>
            </div>
            <TrendingUp className="w-5 h-5 text-gray-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {formatCurrency(paymentEstimate.totalEstimated)}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Combined Payment
          </p>
        </div>
      </div>
    </div>
  )
}
