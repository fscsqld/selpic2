/**
 * WorkCover Calculator Component
 * 
 * WorkCover 보험료 추산 및 계산
 */

'use client'

import { useState, useEffect } from 'react'
import { Calculator, DollarSign, TrendingUp, AlertTriangle, Info } from 'lucide-react'
import { estimateWorkCoverPremium, calculateWorkCoverRate } from '@/src/features/compliance'
import { WorkCoverEstimate } from '@/src/features/compliance/types'
import { formatCurrency } from '@/lib/utils/currency-format'

interface WorkCoverCalculatorProps {
  totalWages?: number
  onEstimateChange?: (estimate: WorkCoverEstimate) => void
}

export function WorkCoverCalculator({ totalWages = 0, onEstimateChange }: WorkCoverCalculatorProps) {
  const [inputWages, setInputWages] = useState(totalWages)
  const [customRate, setCustomRate] = useState<number | undefined>(undefined)
  const [estimate, setEstimate] = useState<WorkCoverEstimate | null>(null)
  const [industry, setIndustry] = useState<string>('')
  const [state, setState] = useState<string>('QLD')

  useEffect(() => {
    if (totalWages > 0) {
      setInputWages(totalWages)
    }
  }, [totalWages])

  useEffect(() => {
    if (inputWages > 0) {
      const rate = customRate !== undefined ? customRate / 100 : calculateWorkCoverRate(industry, state)
      const newEstimate = estimateWorkCoverPremium(inputWages, rate)
      setEstimate(newEstimate)
      if (onEstimateChange) {
        onEstimateChange(newEstimate)
      }
    } else {
      setEstimate(null)
    }
  }, [inputWages, customRate, industry, state, onEstimateChange])

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Calculator className="w-6 h-6" />
          WorkCover Premium Calculator
        </h2>
      </div>

      <div className="space-y-6">
        {/* Input Section */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Total Wages
            </label>
            <input
              type="number"
              value={inputWages}
              onChange={(e) => setInputWages(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <TrendingUp className="w-4 h-4 inline mr-1" />
              Premium Rate (%)
            </label>
            <input
              type="number"
              value={customRate !== undefined ? customRate : (estimate?.rate || 1.5)}
              onChange={(e) => setCustomRate(parseFloat(e.target.value) || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1.5"
              step="0.1"
              min="0"
              max="10"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to use default rate
            </p>
          </div>
        </div>

        {/* Industry & State Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Industry
            </label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Cleaning Services"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              State
            </label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="QLD">Queensland (QLD)</option>
              <option value="NSW">New South Wales (NSW)</option>
              <option value="VIC">Victoria (VIC)</option>
              <option value="SA">South Australia (SA)</option>
              <option value="WA">Western Australia (WA)</option>
              <option value="TAS">Tasmania (TAS)</option>
              <option value="NT">Northern Territory (NT)</option>
              <option value="ACT">Australian Capital Territory (ACT)</option>
            </select>
          </div>
        </div>

        {/* Estimate Result */}
        {estimate && (
          <div className="p-6 bg-blue-50 border-2 border-blue-300 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5" />
              Estimated WorkCover Premium
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Total Wages:</span>
                <span className="font-medium">{formatCurrency(estimate.totalWages)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Premium Rate:</span>
                <span className="font-medium">{estimate.rate.toFixed(2)}%</span>
              </div>
              {estimate.breakdown && (
                <div className="pt-3 border-t border-blue-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-700">Base Premium:</span>
                    <span className="font-medium">{formatCurrency(estimate.breakdown.basePremium)}</span>
                  </div>
                  {estimate.breakdown.adjustments.length > 0 && (
                    <div className="space-y-1">
                      {estimate.breakdown.adjustments.map((adj, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">{adj.description}:</span>
                          <span className="font-medium">{formatCurrency(adj.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="pt-3 border-t-2 border-blue-400 flex justify-between items-center">
                <span className="font-bold text-blue-900 text-lg">Estimated Premium:</span>
                <span className="font-bold text-blue-600 text-xl">{formatCurrency(estimate.estimatedPremium)}</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                <p className="text-xs text-yellow-800">
                  This is an estimate only. Actual premium may vary based on your specific industry classification and claims history. 
                  Please consult with your insurance provider for accurate quotes.
                </p>
              </div>
            </div>
          </div>
        )}

        {!estimate && inputWages === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Calculator className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>Enter total wages to calculate WorkCover premium</p>
          </div>
        )}
      </div>
    </div>
  )
}
